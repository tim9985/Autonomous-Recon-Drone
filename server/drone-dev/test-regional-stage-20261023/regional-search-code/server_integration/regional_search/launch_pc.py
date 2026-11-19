"""School PC connector. Optional idle SIM launch; flight always requires web Start."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import socket

ROOT=Path(__file__).resolve().parents[2]

def start_simulator(package,scene_path):
    from .package import verify,read,save
    import hashlib
    manifest=verify(package);scene=read(scene_path)
    if scene.get('status')!='PASS' or scene.get('buildingActivityVersion')!=manifest['buildingActivityVersion']:
        raise ValueError('Scene must be rebuilt from the current building input')
    receipt=scene_path.with_name('scene-import.json')
    if not receipt.is_file() or hashlib.sha256(receipt.read_bytes()).hexdigest()!=scene.get('importReceiptSha256'):
        raise ValueError('Validated scene import receipt is missing or changed')
    def listening(port):
        try:
            with socket.create_connection(('127.0.0.1',port),.5):return True
        except OSError:return False
    config_path=ROOT/'simulation_world/runtime/config.json';config=read(config_path)
    if any(listening(p) for p in (41451,5762,8766)):
        if config['level']!=scene['level'] or listening(8766):raise RuntimeError('Existing simulator/control preserved; stop the previous control session before selecting this scene')
        return
    if config['worldVersion']!=manifest['worldVersion'] or config['controlScope']!='LOCAL_SIMULATION_ONLY':raise ValueError('Local SIM world changed')
    sys.path.insert(0,str(ROOT/'ml/region_search'))
    from windows_resource_guard import memory_snapshot
    state=memory_snapshot()
    if state['availableBytes']<12*1024**3 or state['commitBytes']/state['commitLimitBytes']>.75:raise RuntimeError('SYSTEM_MEMORY_RESERVE')
    save(scene_path.with_name('runtime-before-start.json'),config)
    config['level']=scene['level'];config['simulationSceneVariant']=dict(version=scene['version'],buildingPolicy=scene['buildingActivityVersion'])
    save(config_path,config)
    subprocess.run([str(ROOT/'drone_simulater/.venv/Scripts/python.exe'),str(ROOT/'simulation_world/launch_minimal.py'),'--max-fps','30','--gpu-crash-debugging'],cwd=ROOT,check=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('--probe',action='store_true');p.add_argument('--existing-tunnel',action='store_true')
    p.add_argument('--start-simulator',action='store_true',help='Launch idle local Unreal/SITL with the validated scene')
    p.add_argument('--package',type=Path,required=True);p.add_argument('--scene',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();processes=[];provider=None;env=os.environ.copy()
    if a.start_simulator and a.probe:raise ValueError('--probe cannot launch the simulator')
    try:
        if not a.existing_tunnel:
            from tkinter import Tk,simpledialog
            from server_integration.local_sim.password_session import start_provider
            root=Tk();root.withdraw();secret=simpledialog.askstring('학교 지역수색 SSH','se@<SERVER_HOST>:7540 · 이번 세션에만 사용',show='*',parent=root);root.destroy()
            if not secret:return
            provider,env=start_provider(secret);secret=None
            # tunnel() obtains the one-session password from this inherited environment.
            os.environ.update({k:v for k,v in env.items() if k.startswith('SSH_') or k in ('DISPLAY','SCHOOL_SIM_ASKPASS_PIPE')})
            from server_integration.local_sim.agent import tunnel
            processes.append(tunnel(18444))
            from server_integration.local_sim.web_tunnel import web_ready
            if not web_ready():processes.append(tunnel(18443,remote_port=18443))
        if a.start_simulator:start_simulator(a.package,a.scene)
        cmd=[str(ROOT/'drone_simulater/.venv/Scripts/python.exe'),'-m','server_integration.regional_search.pc_worker',
             '--package',str(a.package),'--scene',str(a.scene),'--output',str(a.output),'--probe' if a.probe else '--enable-execution']
        return subprocess.call(cmd,cwd=ROOT,env=env)
    finally:
        for process in processes+([provider] if provider else []):
            if process.poll() is None:process.terminate();process.wait(timeout=5)

if __name__=='__main__':raise SystemExit(main())
