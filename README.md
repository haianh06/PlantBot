# Cài đặt môi trường
## Cài đặt uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
uv --version

## Khởi tạo uv
uv init
uv venv
.venv\Scripts\Activate.ps1
uv pip install -r requirements.txt