#!/bin/sh

## This is the startup script for the EC2 server instances.

git fetch
git reset --hard origin/stable
raco make compiler-service.rkt
/usr/bin/nohup racket compiler-service.rkt  --extra-module-provider wescheme-module-provider.rkt &
echo $! > /tmp/wescheme-compiler.pid
