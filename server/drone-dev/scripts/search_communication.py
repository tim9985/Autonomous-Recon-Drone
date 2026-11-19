"""Bounded, metadata-only SIM diagnostics; run inside the SIM backend environment."""
import argparse
import json
from datetime import datetime, timedelta, timezone


def search(connection, minutes=8, route_contains='patrol', limit=12, explain=False):
    if not 1 <= minutes <= 10080 or not 1 <= limit <= 200 or len(route_contains) > 255:
        raise ValueError('Invalid search bounds')
    # Resolve time once: clock_timestamp() in WHERE prevents a time-index range scan.
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    query = """SELECT event_id,event_at,request_id,route,status,duration_ms
        FROM observability.communication_log
        WHERE source='SERVER' AND event_at >= %s AND route LIKE %s ESCAPE '!'
        ORDER BY event_at DESC,event_id ASC LIMIT %s"""
    literal = route_contains.replace('!', '!!').replace('%', '!%').replace('_', '!_')
    if explain:
        query = 'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ' + query
    return connection.execute(query, (since, '%' + literal + '%', limit)).fetchall()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--minutes', type=int, default=8)
    parser.add_argument('--route-contains', default='patrol')
    parser.add_argument('--limit', type=int, default=12)
    parser.add_argument('--explain', action='store_true')
    args = parser.parse_args()
    from drone_backend.core import transaction, output
    with transaction() as connection:
        connection.execute('SET TRANSACTION READ ONLY')
        print(json.dumps(output(search(connection, **vars(args)))))
