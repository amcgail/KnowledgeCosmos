from .common import *
from time import sleep

@memory.cache
def Test2():
    print('starting')
    return "ALEC"

Test2()
Test2()