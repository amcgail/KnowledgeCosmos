import torch
print('CUDA available:', torch.cuda.is_available())
print('CUDA device name:', torch.cuda.get_device_name())