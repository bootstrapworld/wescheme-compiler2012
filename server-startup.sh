#!/bin/sh

## This is the startup script for the EC2 server instances.

git fetch
git reset --hard origin/stable
/home/ubuntu/racket/bin/raco make compiler-service.rkt
/usr/bin/nohup /home/ubuntu/racket/bin/racket compiler-service.rkt  --extra-module-provider wescheme-module-provider.rkt &
