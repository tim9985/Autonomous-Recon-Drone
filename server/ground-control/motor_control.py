"""School-server CLI for the restricted Raspberry Pi ground-test endpoint."""
import argparse,json,pathlib,subprocess,time,uuid

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('action',choices=['status','fc-query','motor-test'])
    ap.add_argument('--motor',type=int,choices=range(0,5),help='0=all motors together; 1..4=test sequence')
    ap.add_argument('--seconds',type=int,default=2,choices=range(1,21))
    ap.add_argument('--props-removed',action='store_true')
    ap.add_argument('--request-id',type=uuid.UUID)
    a=ap.parse_args()
    if a.action=='motor-test' and (a.motor is None or not a.props_removed):ap.error('motor-test requires --motor and --props-removed')
    root=pathlib.Path(__file__).resolve().parent
    request={'id':str(a.request_id or uuid.uuid4()),'expires':time.time()+45,'action':a.action.replace('-','_')}
    if a.action=='motor-test':request.update(motor=a.motor,seconds=a.seconds,props_removed=a.props_removed)
    p=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=5','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-o','UserKnownHostsFile='+str(root/'gateway_known_hosts'),'-i',str(root/'control_key'),'-p','19561','gateway@127.0.0.1'],input=json.dumps(request)+'\n',capture_output=True,text=True,timeout=50)
    if not p.stdout:
        print(json.dumps({'ok':False,'error':'GATEWAY_CONTROL_UNAVAILABLE','ssh_returncode':p.returncode}));return 1
    result=json.loads(p.stdout)
    (root/'results').mkdir(exist_ok=True)
    (root/'results'/(request['id']+'.json')).write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))
    return 0 if result.get('ok') else 1

if __name__=='__main__':raise SystemExit(main())
