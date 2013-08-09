#!/bin/sh

## This is the startup script for the EC2 server instances.

git fetch
git checkout stable
git merge origin/stable
/home/ubuntu/racket/bin/raco make compiler-service.rkt
/usr/bin/nohup /home/ubuntu/racket/bin/racket sandboxed-server.rkt --port 8000 --extra-module-provider wescheme-module-provider.rkt &
