#!/bin/bash

# Get path of this script so that we can use paths relative to this script's path
SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"

# Use docker-compose to start the t5s.app.dev container
docker-compose -p mailhog-awesome -f $SCRIPTPATH/tools/docker/docker-compose.yml up --build -d

# Attach to dev container if a TTY is present
if tty -s
then
  docker exec -it mailhog-awesome.dev bash
fi
