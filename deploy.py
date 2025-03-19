#S3_BUCKET = 
# connect to the Neon server and upload the postgres data
#psql_connection_string = "postgresql://papers_owner:Lnewafl92POi@ep-misty-dew-a501ez6w.us-east-2.aws.neon.tech/papers?sslmode=require"
# 

from backend.scripts.common import *
import shutil

base = Path(__file__).parent

f = Path(DATA_FOLDER)
potreef = f / 'potrees_converted'

# copy all potree directories into the frontend/pointclouds folder
target = base / 'frontend' / 'pointclouds'

for p in potreef.glob('*'):
    print('Copying potree', p)
    shutil.copytree(p, target / p.name, dirs_exist_ok=True)