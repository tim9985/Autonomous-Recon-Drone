SET LOCAL ROLE drone_schema_owner;
SET LOCAL search_path=pg_catalog,drone,public,pg_temp;

CREATE TABLE drone.spatial_release (
 release_id text PRIMARY KEY, environment_id text NOT NULL, world_version text NOT NULL,
 grid_version text NOT NULL, source_crs integer NOT NULL CHECK(source_crs IN (32652,5179)),
 content_hash text NOT NULL CHECK(content_hash ~ '^[0-9a-f]{64}$'),
 manifest jsonb NOT NULL, spatial_config_id uuid NOT NULL REFERENCES drone.config_version,
 coordinate_config_id uuid NOT NULL REFERENCES drone.config_version,
 registered_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE drone.spatial_region (
 release_id text NOT NULL REFERENCES drone.spatial_release,
 source_id text NOT NULL CHECK(length(source_id) BETWEEN 1 AND 128),
 properties jsonb NOT NULL, geom geometry(MultiPolygon,4326) NOT NULL,
 representative_point geometry(Point,4326) NOT NULL,
 PRIMARY KEY(release_id,source_id),
 CHECK(ST_IsValid(geom) AND NOT ST_IsEmpty(geom))
);
CREATE INDEX spatial_region_geom ON drone.spatial_region USING gist(geom);
CREATE TABLE drone.mission_presentation (
 mission_id uuid PRIMARY KEY REFERENCES drone.mission,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 mission_type text NOT NULL CHECK(mission_type IN ('AREA_RECON','APPEARANCE_SEARCH')),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE drone.mission_spatial_revision (
 mission_id uuid NOT NULL, revision integer NOT NULL,
 release_id text NOT NULL REFERENCES drone.spatial_release,
 selected_zone_ids jsonb NOT NULL CHECK(jsonb_typeof(selected_zone_ids)='array'),
 request_id uuid NOT NULL UNIQUE, request_hash text NOT NULL,
 name text NOT NULL, mission_type text NOT NULL,
 PRIMARY KEY(mission_id,revision),
 FOREIGN KEY(mission_id,revision) REFERENCES drone.mission_revision(mission_id,revision)
);

CREATE FUNCTION drone.school_save_draft(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE m drone.mission; old drone.mission_spatial_revision; r drone.spatial_release;
 n integer; rev integer; area geometry; mid uuid=(p->>'mission_id')::uuid;
 ids text[]; policy uuid; model uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(20261005,1);
 SELECT * INTO m FROM drone.mission WHERE mission_id=mid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RESOURCE_NOT_FOUND'; END IF;
 SELECT * INTO old FROM drone.mission_spatial_revision WHERE request_id=(p->>'request_id')::uuid;
 IF FOUND THEN
  IF old.mission_id<>mid OR old.request_hash<>p->>'request_hash' THEN RAISE EXCEPTION 'ID_CONFLICT'; END IF;
  RETURN jsonb_build_object('mission_id',mid,'revision',old.revision,'duplicate',true);
 END IF;
 IF coalesce(m.draft_revision,0)<>(p->>'expected_draft_revision')::integer THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
 IF m.state NOT IN ('DRAFT','READY') THEN RAISE EXCEPTION 'MISSION_NOT_EDITABLE'; END IF;
 SELECT * INTO r FROM drone.spatial_release WHERE release_id=p->>'release_id';
 IF NOT FOUND THEN RAISE EXCEPTION 'SPATIAL_RELEASE_NOT_FOUND'; END IF;
 SELECT array_agg(value ORDER BY value) INTO ids FROM jsonb_array_elements_text(p->'selected_zone_ids');
 IF cardinality(ids)<1 OR cardinality(ids)>4096 OR cardinality(ids)<>(SELECT count(DISTINCT x) FROM unnest(ids) x) THEN RAISE EXCEPTION 'INVALID_SELECTION'; END IF;
 SELECT count(*),ST_Multi(ST_UnaryUnion(ST_Collect(geom))) INTO n,area
 FROM drone.spatial_region WHERE release_id=r.release_id AND source_id=ANY(ids);
 IF n<>cardinality(ids) OR NOT ST_IsValid(area) OR ST_IsEmpty(area) THEN RAISE EXCEPTION 'INVALID_SELECTION'; END IF;
 SELECT config_id INTO policy FROM drone.config_version WHERE kind='POLICY' AND status='APPROVED' AND payload->>'environment'='SIM' ORDER BY created_at DESC,config_id LIMIT 1;
 SELECT config_id INTO model FROM drone.config_version WHERE kind='MODEL' AND status='APPROVED' AND payload->>'environment'='SIM' ORDER BY created_at DESC,config_id LIMIT 1;
 IF policy IS NULL OR model IS NULL THEN RAISE EXCEPTION 'CONFIG_NOT_READY'; END IF;
 rev=coalesce(m.draft_revision,0)+1;
 INSERT INTO drone.mission_revision(mission_id,revision,area_geom,priority_sources,conditions,spatial_config_id,coordinate_config_id,policy_config_id,model_config_id,planner_modes,grid_version)
 VALUES(mid,rev,area,'[]',p->'conditions',r.spatial_config_id,r.coordinate_config_id,policy,model,'{"environment":"SIM","executor_connected":false}',r.grid_version);
 INSERT INTO drone.search_region(region_id,mission_id,mission_revision,grid_version,region_type,source_features,region_geom,representative_point,total_area_m2,remaining_area_m2,state)
 SELECT md5(mid::text||':'||rev::text||':'||r.release_id||':'||source_id)::uuid,mid,rev,r.grid_version,'SIM_MANUAL',
 jsonb_build_object('release_id',r.release_id,'source_id',source_id,'properties',properties,'environment','SIM'),geom,representative_point,ST_Area(geom::geography),ST_Area(geom::geography),'DRAFT'
 FROM drone.spatial_region WHERE release_id=r.release_id AND source_id=ANY(ids);
 INSERT INTO drone.mission_spatial_revision VALUES(mid,rev,r.release_id,to_jsonb(ids),(p->>'request_id')::uuid,p->>'request_hash',p->>'name',p->>'mission_type');
 INSERT INTO drone.mission_presentation(mission_id,name,mission_type) VALUES(mid,p->>'name',p->>'mission_type')
 ON CONFLICT(mission_id) DO UPDATE SET name=EXCLUDED.name,mission_type=EXCLUDED.mission_type,updated_at=CURRENT_TIMESTAMP;
 PERFORM drone.backend_mission_state(jsonb_build_object('mission_id',mid,'draft_revision',rev,'mode','draft'));
 RETURN jsonb_build_object('mission_id',mid,'revision',rev,'duplicate',false);
END $$;

CREATE FUNCTION drone.school_approved_appearance() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,drone,public,pg_temp AS $$
DECLARE settings jsonb; typ text;
BEGIN
 IF NEW.active_revision IS DISTINCT FROM OLD.active_revision AND NEW.active_revision IS NOT NULL THEN
  SELECT r.conditions,s.mission_type INTO settings,typ FROM drone.mission_revision r
  JOIN drone.mission_spatial_revision s USING(mission_id,revision)
  WHERE r.mission_id=NEW.mission_id AND r.revision=NEW.active_revision;
  IF FOUND THEN NEW.appearance_query=CASE WHEN typ='APPEARANCE_SEARCH' THEN settings->'appearance' ELSE NULL END; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER school_approved_appearance BEFORE UPDATE ON drone.mission FOR EACH ROW EXECUTE FUNCTION drone.school_approved_appearance();
REVOKE ALL ON drone.spatial_release,drone.spatial_region,drone.mission_presentation,drone.mission_spatial_revision FROM PUBLIC;
GRANT SELECT ON drone.spatial_release,drone.spatial_region,drone.mission_presentation,drone.mission_spatial_revision TO drone_api;
REVOKE ALL ON FUNCTION drone.school_save_draft(jsonb),drone.school_approved_appearance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION drone.school_save_draft(jsonb) TO drone_api;
