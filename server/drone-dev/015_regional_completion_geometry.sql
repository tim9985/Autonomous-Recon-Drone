-- Preserve observation criteria while normalizing projected-cell roundoff at the DB boundary.
DO $$ BEGIN
 IF current_database()<>'drone_dev' AND current_database() NOT LIKE 'regional_verify_%' THEN RAISE EXCEPTION 'DEV only'; END IF;
END $$;
SET LOCAL ROLE drone_schema_owner;
SET LOCAL search_path=pg_catalog,drone,public,pg_temp;
DO $migration$
DECLARE body text; needle text;
BEGIN
 body=pg_get_functiondef('drone.regional_execute_write(text,jsonb)'::regprocedure);
 IF strpos(body,'REGIONAL_CELL_GEOMETRY_CHANGED')>0 THEN RAISE EXCEPTION 'Geometry normalization already installed'; END IF;
 needle='   INSERT INTO drone.regional_completion VALUES';
 IF strpos(body,needle)=0 OR strpos(body,'cid text;')=0 THEN RAISE EXCEPTION 'Regional writer changed; review required'; END IF;
 body=replace(body,'cid text;','cid text; normalized_cell geometry;');
 body=replace(body,needle,$patch$
   -- This contract is limited to the registered Gumi campus EPSG:32652 package.
   -- Projection can collapse a tiny polygon edge in WGS84. Keep polygonal area,
   -- reject material changes, and retain every original frame/evidence requirement.
   normalized_cell=ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(v->'geometry'),4326)),3));
   IF ST_IsEmpty(normalized_cell) OR NOT ST_IsValid(normalized_cell)
     OR abs(ST_Area(ST_Transform(normalized_cell,32652))-(v->>'areaM2')::float8)>greatest(0.0001,(v->>'areaM2')::float8*0.000001)
     THEN RAISE EXCEPTION 'REGIONAL_CELL_GEOMETRY_CHANGED'; END IF;
   v=v||jsonb_build_object('geometry',ST_AsGeoJSON(normalized_cell,17)::jsonb);
   INSERT INTO drone.regional_completion VALUES$patch$);
 body=replace(body,'ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(v->''geometry''),4326))','normalized_cell');
 EXECUTE body;
END $migration$;
