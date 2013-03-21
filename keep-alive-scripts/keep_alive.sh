#!/bin/sh

/home/ubuntu/racket/bin/racket /home/ubuntu/is_dead.rkt
if [ $? -eq "1" ];
then
    /home/ubuntu/startup.sh
else
    :
fi
