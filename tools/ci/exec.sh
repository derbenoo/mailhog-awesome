#!/bin/bash

# Execute a command inside the container
# Manually parse the ~/.bashrc file as bash skips this for non-interactive sessions
docker exec -u root mailhog-awesome.dev bash -c "source ~/.bashrc ; $1"
