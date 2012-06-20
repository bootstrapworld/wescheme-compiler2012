#!/bin/bash

## Make all the js files for the tests files.

batchcompiler="../batch/batch.ss"

basedir=`pwd`;


build_mzjs() {
## run mzjs over all the files
    cd ${basedir}
    for file in tests/programs/*/*.ss
    do
	cd `dirname ${file}`
	echo "Making `basename ${file}`"
	mzscheme ${basedir}/src/mzjs.ss `basename ${file}`
	cd ${basedir}
    done
    cd ${basedir}
}


test_output() {
    cd ${basedir}
    for file in tests/programs/*/*.js
    do
	cd ${basedir}
	cd `dirname ${file}`
	echo
	echo
	echo "Testing ${file}"
	if [ -f input.txt ]; then
	    node `basename ${file}` <input.txt >observed.txt
	else
 	    node `basename ${file}` >observed.txt
	fi

 	if [ -f expected.txt ]; then
  	    diff expected.txt observed.txt
  	else
  	    echo "No expected.txt to compare against"
  	    cat observed.txt
  	fi
    done
    cd ${basedir}
}



if [ "$1" == "mzjs" ]; then
    build_mzjs
elif [ "$1" == "test" ]; then
    test_output
else
#    build_mzjs
    test_output
fi


#build_mzjs
#build_batch