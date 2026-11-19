import tempfile
import unittest
from pathlib import Path
from uuid import uuid4
from .package import save, read, digest, verify, checked_file
from .worker import process


class PackageAndQueueContracts(unittest.TestCase):
    def test_package_tamper_and_escape(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);save(root/'input.json',{'camera':'bound'})
            import hashlib
            m=dict(schema='REGIONAL_SEARCH_INPUT_V1',environment='SIM',files={'input.json':hashlib.sha256((root/'input.json').read_bytes()).hexdigest()})
            m['packageId']=digest(m);save(root/'package.json',m)
            self.assertEqual(verify(root),m)
            save(root/'input.json',{'camera':'changed'})
            with self.assertRaises(ValueError):verify(root)
            with self.assertRaises(ValueError):checked_file(root,'../outside.json')
            with self.assertRaises(ValueError):checked_file(root,'C:\\outside.json')

    def test_missing_package_terminal_failure_and_idempotency(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);queue=root/'queue';packages=root/'packages';packages.mkdir()
            jid=str(uuid4());request=dict(packageId='a'*64,regionId='test-region')
            path=queue/'requests'/(jid+'.json')
            save(path,dict(jobId=jid,requestHash='b'*64,request=request))
            process(path,queue,packages)
            result_path=queue/'results'/(jid+'.json');before=result_path.read_bytes()
            result=read(result_path)['result']
            self.assertEqual(result['state'],'FAILED')
            self.assertEqual(result['actualEvidenceWrites'],0)
            self.assertIs(result['realExecutable'],False)
            process(path,queue,packages);self.assertEqual(before,result_path.read_bytes())
            save(path,dict(jobId=jid,requestHash='c'*64,request=request))
            with self.assertRaises(ValueError):process(path,queue,packages)


if __name__=='__main__':unittest.main()
