# Runner image for engineering scenarios. Build, push, and deploy by digest:
#   docker build -t registry.example/fydell-runner:py312-pytest833 services/engineering-runner
#   docker push registry.example/fydell-runner:py312-pytest833
#   FYDELL_RUNNER_IMAGE=registry.example/fydell-runner@sha256:<digest>
# Pin the base image by digest as well before production use.
FROM python:3.12-slim

RUN pip install --no-cache-dir "pytest==8.3.3" \
 && python -c "import pytest; assert pytest.__version__ == '8.3.3'"

# No application code, secrets or network tools. Candidate files arrive on
# stdin per run and live only in the container's tmpfs.
USER 65534:65534
WORKDIR /tmp
