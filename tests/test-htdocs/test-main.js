$(document).ready(function() {
    $("#failure-index").css("display", "none");
    $(document.body).append("<p>This is the test suite.</p>");
    runTests();
});




var runTests = function() {
    "use strict";
    //////////////////////////////////////////////////////////////////////


    sys.print = function(str) {
        $(document.body).append($("<span>").text(str).css("white-space", "pre"));
    };
    
    sys.error = function(e) {
        if (typeof(console) !== 'undefined' && console.log) {
	    if (e.stack) {
		console.log(e.stack);
	    }
	    else {
		console.log("Error: " + str);
	    }
	}
        $(document.body).append($("<span>").text(e.message).css("white-space", "pre"));
        noteRedFailure(e);
    };



    var run = function(state) {
	while (!state.isStuck()) {
	    runtime.step(state);
	}
	return state.v;
    }

    var step = runtime.step;


    //////////////////////////////////////////////////////////////////////

    var EXIT_ON_FIRST_ERROR = false;


    //////////////////////////////////////////////////////////////////////



    var makeStateWithConstant = function(c) {
        var s = new runtime.State();
        s.v = c;
        return s;
    };


    var makePrefix = function(n) {
        var arr = [];    
        for (var i = 0; i < n; i++) {
	    arr.push(false);
        }
        return new control.Prefix({numLifts: 0,
			           toplevels: arr });
    };

    var makeMod = function(prefix, body) {
        return new control.ModControl(prefix, body);
    };

    var makeConstant = function(c) {
        return new control.ConstantControl(c);
    };

    var makeBranch = function(x, y, z) { 
        return new control.BranchControl(x, y, z);
    };

    var makeSeq = function() {
        return new control.SeqControl(arguments);
    };

    var makeBeg0 = function() {
        return new control.Beg0Control(arguments);
    };

    var makeToplevel = function(depth, pos) {
        return new control.ToplevelControl(depth, pos);
    };


    var makeDefValues = function(ids, body) {
        return new control.DefValuesControl(ids, body);
    };


    var makeLam = function(arity, closureMap, body) {
        var aClosureMap = [];
        var aClosureTypes = [];
        var aParamTypes = [];
        for (var i = 0; i < closureMap.length; i++) {
	    aClosureMap.push(closureMap[i]);
	    aClosureTypes.push("val/ref");
        }
        for (var i = 0; i < arity; i++) {
	    aParamTypes.push("val");
        }

        return new control.LamControl({'numParams': arity,
				       'paramTypes': aParamTypes,
				       'isRest': false,
				       'closureMap' : aClosureMap,
				       'closureTypes' : aClosureTypes,
				       'body': body});    
    };


    var makeLamWithRest = function(arity, closureMap, body) {
        var aClosureMap = [];
        var aClosureTypes = [];
        var aParamTypes = [];
        for (var i = 0; i < closureMap.length; i++) {
	    aClosureMap.push(closureMap[i]);
	    aClosureTypes.push("val/ref");
        }
        for (var i = 0; i < arity; i++) {
	    aParamTypes.push("val");
        }

        return new control.LamControl({'numParams': arity,
				       'paramTypes': aParamTypes,
				       'isRest': true,
				       'closureMap' : aClosureMap,
				       'closureTypes' : aClosureTypes,
				       'body': body});    
    };






    var makePrimval = function(name) {
        return new control.PrimvalControl(name);
    };


    var makeApplication = function(rator, rands) {
        assert.ok(typeof(rands) === 'object' && rands.length !== undefined);
        return new control.ApplicationControl(rator, rands);
    };


    var makeLocalRef = function(n) {
        return new control.LocalrefControl(n);
    };


    var makeApplyValues = function(proc, argsExpr) {
        return new control.ApplyValuesControl(proc, argsExpr);
    };


    var makeLet1 = function(rhs, body) {
        return new control.LetOneControl(rhs, body);
    };


    var makeLetVoid = function(count, isBoxes, body) {
        return new control.LetVoidControl({count: count,
				           isBoxes : isBoxes,
				           body : body});
    };

    var makeBoxenv = function(pos, body) {
        return new control.BoxenvControl(pos, body);
    };


    var makeInstallValue = function(count, pos, isBoxes, rhs, body) {
        return new control.InstallValueControl({count: count,
					        pos: pos,
					        isBoxes: isBoxes,
					        rhs: rhs,
					        body: body});

    };


    var makeWithContMark = function(key, val, body) {
        return new control.WithContMarkControl(key, val, body);
    };


    var makeAssign = function(id, rhs, isUndefOk) {
        return new control.AssignControl({id: id,
				          rhs: rhs,
				          isUndefOk: isUndefOk});
    };

    
    var makeVarref = function(aToplevel) {
        return new control.VarrefControl(aToplevel);
    };


    var makeClosure = function(genId) {
        return new control.ClosureControl(genId);
    };


    var makeCaseLam = function(name, clauses) {
        assert.ok(typeof(clauses) === 'object' && clauses.length !== undefined);
        return new control.CaseLamControl(name, clauses);
    };


    var makeLetrec = function(procs, body) {
        return new control.LetRecControl(procs, body);
    };


    /////////////////////////////////////////////////////////////////////


    var testPrim = function(funName, f, baseArgs, expectedValue) {
	var state = new runtime.State();
	var args = [];
	for (var i = 0; i < baseArgs.length; i++) {
	    args.push(makeConstant(f(baseArgs[i])));
	}
	state.pushControl(makeApplication(makePrimval(funName), args));
	assert.deepEqual(run(state), expectedValue);
    };

    var testPrimF = function(funName, f, baseArgs, expectedValue, transform) {
	var state = new runtime.State();
	var args = [];
	for (var i = 0; i < baseArgs.length; i++) {
	    args.push(makeConstant(f(baseArgs[i])));
	}
	state.pushControl(makeApplication(makePrimval(funName), args));
	assert.deepEqual(transform(run(state)), expectedValue);
    }

    var listToStringArray = function(lst) {
	var ret = [];
	while ( !lst.isEmpty() ) {
	    ret.push( lst.first().toString() );
	    lst = lst.rest();
	}
	return ret;
    }

    var id = function(x) {return x;};



    //////////////////////////////////////////////////////////////////////

    var failureCount = 0;

    var noteRedFailure = function(e) {
        failureCount++;
        $("#failure-index").css("display", "inline");
        $("#failure-index").append($("<a/>").attr("href", "#fail" + failureCount)
                                   .text("" + failureCount));
        var failMsgText = " FAIL" + ((e.message || e || '') ? 
                                  ": " + (e.message || e || '') : "");
        $(document.body).append($("<span/>").text(failMsgText)
                                .css("color", "red")
                                .css("white-space", "pre")
                                .append($("<a/>").attr("name", "fail" + failureCount)));
        $(document.body).css("background-color", "#eeaaaa");
    };

    var runRawTest = function(name, thunk) {
        sys.print("running " + name + "... ");
        try {
	    thunk();
        } catch(e) {
            noteRedFailure(e);
	    sys.print("\n");
	    sys.print(e);
            sys.print('\n');
	    if (EXIT_ON_FIRST_ERROR) {
	        if (typeof(console) !== 'undefined' && console.log && e.stack) {
		    console.log(e.stack);
		}
                //		if (typeof(console) !== 'undefined' && console.log && e.stack) {
                //			console.log(e.stack);
                //		}
                //		sys.print(sys.inspect(e) + '\n');
	        throw e;
	    } else {
                return;
            }
        }
        sys.print(" ok\n")
    };

    var asyncTests = [];


    var queueAsyncTest = function(name, f) {
        asyncTests.push({name: name, f: f});
    };


    var runAsyncTests = function(i, k) {
        if (i < asyncTests.length) {
            runAsyncTest(asyncTests[i].name,
                         asyncTests[i].f,
                         function() {
                             setTimeout(function() {
                                 runAsyncTests(i+1, k);
                             }, 10);
                         });
        } else {
            k();
        }
    };

    var runAsyncTest = function(name, f, k) {
        sys.print("running " + name + "... ");
        var success = function() {
            sys.print(" ok\n")
            k();
        };
        var fail = function(e) {
            noteRedFailure(e);
	    sys.print("\n");
	    sys.print(e);
            sys.print('\n');
            k();
        };
        try {
            f(success, fail);
        } catch(e) {
            fail(e);
        }
    };




    var evaluator = new Evaluator(
        { write: function(x) { writeToInteractions(x) },
          writeError: function(err) { reportError(err) },
          compilationServletUrl: "/servlets/standalone.ss",
          scriptCompilationServletUrl: "/servlets/standalone.ss"
        });
    evaluator.setRootLibraryPath("/collects");

    var forEachK = function(f, elts, k) {
        var loop = function(i, k) {
            if (i < elts.length) {
                f(elts[i], function() {
                    setTimeout(function() { loop(i+1, k); }, 0);
                });
            } else {
                setTimeout(k, 0);
            }
        };
        loop(0, k);
    };


    var writeToInteractions = function(thing) {
        if (typeof thing === 'string' || typeof thing === 'number') {
            var dom = document.createElement('div');
            dom.style['white-space'] = 'pre';
            dom.appendChild(document.createTextNode(thing + ''));
            $(document.body).append(dom);
        } else {
            $(document.body).append(thing);
        }
    };


    var reportError = function(exn) {
        // Under google-chrome, this will produce a nice error stack
        // trace that we can deal with.
        if (typeof(console) !== 'undefined' && console.log &&
            exn && exn.stack) {
            console.log(exn.stack);
        }

        var domElt = document.createElement('div');
        domElt.style['color'] = 'red';

        if (exn.domMessage) {
            domElt.appendChild(exn.domMessage);
        } else {
            domElt.appendChild(document.createTextNode(evaluator.getMessageFromExn(exn)+""));
        }

        var stacktrace = evaluator.getTraceFromExn(exn);
        for (var i = 0; i < stacktrace.length; i++) {
            domElt.appendChild(document.createElement("br"));
            domElt.appendChild(document.createTextNode(
                "in " + stacktrace[i].id +
                    ", at offset " + stacktrace[i].offset +
                    ", line " + stacktrace[i].line +
                    ", column " + stacktrace[i].column +
                    ", span " + stacktrace[i].span));
        };
        if(types.isExnFailContractArityWithPosition(exn.val)) {
            domElt.appendChild(document.createTextNode(types.toDisplayedString(exn.val._fields[2])));
        }
        writeToInteractions(domElt);
    };



    jQuery.ajax({url: "/listTestPrograms"}).done(function(data) {
        var listOfPrograms = JSON.parse(data);
        forEachK(
            function(programName, k) {
                jQuery.ajax({url : "/" + programName}).done(function(programText) {
                    $(document.body).append("Running: " + programName);
                    $(document.body).append("<br/>");
                    evaluator.executeProgram(programName,
                                             programText,
                                             k,
                                             function(exn) { reportError(exn);
                                                             k(); });
                });
            },
            listOfPrograms,
            function() {
                runLowLevelEvaluatorTests();
            });
    });
                 
 

               





    var runLowLevelEvaluatorTests = function() {


        //////////////////////////////////////////////////////////////////////




        sys.print("running low-level evaluator tests...\n\n");

        runRawTest("simple empty state",
	           // Simple running should just terminate, and always be at the "stuck" state.
	           function() { 
	               var state = new runtime.State();
	               assert.ok(state.isStuck());
	               run(state);
	               assert.ok(state.isStuck());
	           });



        // Numeric constants should just evaluate through.
        runRawTest("Numeric constant", 
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeConstant(42));
	               var result = run(state);
	               assert.deepEqual(result, 
			                42);
	               
	               assert.deepEqual(state, makeStateWithConstant(42));
	           });



        // String constant.
        runRawTest("String constant",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeConstant("hello world"));
	               var result = run(state);
	               assert.deepEqual(result, 
			                "hello world");

	               assert.deepEqual(state, makeStateWithConstant("hello world"));
	           });


        // boolean constant.
        runRawTest("Boolean constant", 
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeConstant(true));
	               var result = run(state);
	               assert.deepEqual(result, true);

	               assert.deepEqual(state, makeStateWithConstant(true));
	           });



        runRawTest("external call",
	           function() {
	               var state = new runtime.State();
	               interpret.call(state, 
			              primitive.getPrimitive("*"),
			              [2, 3],
			              function(v) { assert.equal(v, 6) });
	           });



        // Simple branch to true
        runRawTest("Simple boolean branch to true",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeBranch(makeConstant(true),
					            makeConstant(true),
					            makeConstant(false)));
	               var result = run(state);
	               assert.deepEqual(result, true);
	           });


        // Simple branch to false
        runRawTest("Simple boolean branch to false",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeBranch(makeConstant(false),
					            makeConstant(false),
					            makeConstant(true)));
	               var result = run(state);
	               assert.deepEqual(result, 
			                true);

	               assert.deepEqual(state, makeStateWithConstant(true));
	           });



        // (if (if true false true) "apple" "pie") --> "pie"
        runRawTest("nested booleans",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeBranch(makeBranch(makeConstant(true), makeConstant(false), makeConstant(true)),
					            makeConstant("apple"),
					            makeConstant("pie")));
	               var result = run(state);
	               assert.deepEqual(result, "pie");

	               assert.deepEqual(state, makeStateWithConstant("pie"));
	           });



        // Sequences
        runRawTest("Sequences",
	           function() {
	               var state1 = new runtime.State();
	               state1.pushControl(makeSeq(makeConstant(3),
				                  makeConstant(4),
				                  makeConstant(5)));
	               step(state1);
	               step(state1);
	               assert.ok(!state1.isStuck());
	               assert.deepEqual(state1.v, 3);
	               step(state1);
	               assert.deepEqual(state1.v, 4);
	               var result = run(state1);
	               assert.deepEqual(result, 5);

	               assert.deepEqual(state1, makeStateWithConstant(5));    
	           });



        // Module prefix
        runRawTest("module prefix",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(3),
				                 []));
	               run(state);   
	               assert.equal(1, state.vstack.length);
	               assert.ok(state.vstack[0] instanceof types.PrefixValue);
	               assert.equal(state.vstack[0].length(), 3);
	           });


        runRawTest("toplevel lookup",
	           // toplevel lookup
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(3),
				                 []));
	               run(state);   

	               state.vstack[0].set(0, "zero");
	               state.vstack[0].set(1, "one");
	               state.vstack[0].set(2, "two");

	               state.pushControl(makeToplevel(0, 0));
	               assert.equal(run(state), "zero");

	               state.pushControl(makeToplevel(0, 1));
	               assert.equal(run(state), "one");

	               state.pushControl(makeToplevel(0, 2));
	               assert.equal(run(state), "two");
	           });



        runRawTest("define-values",
	           // define-values
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(3), []));
	               run(state);   
	               state.pushControl(makeDefValues([makeToplevel(0, 0)],
					               makeConstant("try it")));
	               run(state);

	               var expectedState = new runtime.State();
	               expectedState.pushControl(makeMod(makePrefix(3),
					                 []));
	               run(expectedState);   
	               expectedState.v = "try it";
	               expectedState.vstack[0].set(0, "try it");
	               assert.deepEqual(state, expectedState);
	           });


        runRawTest("lambda",
	           // lambda
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(3), []));
	               run(state);   
	               state.pushControl(makeDefValues([makeToplevel(0, 0)],
					               makeConstant("Some toplevel value")));

	               run(state);
	               state.pushControl(makeLam(3, [0], makeConstant("I'm a body")));

	               var result = run(state);

	               // result should be a lambda.
	               assert.ok(result instanceof runtime.ClosureValue);
	               assert.equal(result.closureVals.length, 1);
	               assert.ok(result.closureVals[0] instanceof types.PrefixValue);
	               assert.deepEqual(result.body, makeConstant("I'm a body"));
	               assert.equal(result.numParams, 3);
	           });



        runRawTest("primval (current-print)",
	           // primval
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makePrimval("current-print"));
	               var result = run(state);
	               assert.ok(result instanceof runtime.Primitive);
	           });


        runRawTest("primval on bad primitive should throw error",
	           // primval on unknowns should throw error
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makePrimval("foobar"));
	               assert.throwsExn(function() { run(state); });
	           });


        runRawTest("Primval on *",
	           // primval on *
	           // primval
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makePrimval("*"));
	               var result = run(state);
	               assert.ok(result instanceof runtime.Primitive);
	           });


        runRawTest("My own list function",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(makeLamWithRest(0, [], makeLocalRef(0)),
					                 [makeConstant("one"),
					                  makeConstant("two"),
					                  makeConstant("three")]))
	               var result = run(state);
	               assert.deepEqual(result,
			                runtime.list(["one", "two", "three"]));
	           });


        runRawTest("primitive application",
	           // primitive application.
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(makePrimval("*"),
					                 [makeConstant(runtime.rational(3)),
					                  makeConstant(runtime.rational(5))]));
	               var result = run(state);
	               assert.deepEqual(result, runtime.rational(15));
	               assert.equal(state.vstack.length, 0);
	           });


        runRawTest("primitive application, no arguments",
	           // primitive application with no arguments.
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(makePrimval("*"),
					                 []));
	               var result = run(state);
	               assert.deepEqual(result, runtime.rational(1));
	               assert.equal(state.vstack.length, 0);
	           });


        runRawTest("primitive application, nested application",
	           // primitive application, with nesting
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(
		           makePrimval("*"),
		           [makeApplication(
		               makePrimval("*"),
		               [makeConstant(runtime.rational(3)),
		                makeConstant(runtime.rational(5))]),
		            makeConstant(runtime.rational(7))]));
	               var result = run(state);
	               assert.deepEqual(result, runtime.rational(105));
	               assert.equal(state.vstack.length, 0);
	           });


        runRawTest("primitive appliation, nesting, testing non-commutativity",
	           // primitive application, with nesting, testing order
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(
		           makePrimval("string-append"),
		           [makeApplication(
		               makePrimval("string-append"),
		               [makeConstant(runtime.string("hello")),
		                makeConstant(runtime.string("world"))]),
		            makeConstant(runtime.string("testing"))]));
	               var result = run(state);
	               assert.deepEqual(result, runtime.string("helloworldtesting"));
	               assert.equal(state.vstack.length, 0);
	           });

        runRawTest("primitive application, subtraction",
	           // subtraction
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(
		           makePrimval("-"),
		           [makeApplication(
		               makePrimval("-"),
		               [makeConstant(runtime.rational(3)),
		                makeConstant(runtime.rational(4))]),
		            makeConstant(runtime.rational(15))]));
	               var result = run(state);
	               assert.deepEqual(result, runtime.rational(-16));
	               assert.equal(state.vstack.length, 0);
	           });

        runRawTest("primitive application, unary subtraction (negation)", 
	           // Checking negation.
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(
		           makePrimval("-"),
		           [makeConstant(runtime.rational(1024))]));
	               var result = run(state);
	               assert.deepEqual(result, runtime.rational(-1024));
	               assert.equal(state.vstack.length, 0);
	           });


        runRawTest("closure application",
	           // Closure application
	           // lambda will just return a constant value
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(1), []));
	               run(state);   
	               assert.equal(state.vstack.length, 1);
	               
	               state.pushControl(makeDefValues([makeToplevel(0, 0)],
					               makeLam(1, [],
						               makeConstant("I'm a body"))));
	               run(state);
	               state.pushControl(makeApplication(makeToplevel(1, 0), [makeConstant("boo")]));
	               var result = run(state);
	               assert.equal(result, "I'm a body");

	               assert.equal(state.vstack.length, 1);
	           });


        runRawTest("closure application, defining square",
	           // Closure application
	           // lambda will square its argument
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(1), []));
	               run(state);   
	               assert.equal(state.vstack.length, 1);
	               
	               state.pushControl(makeDefValues([makeToplevel(0, 0)],
					               makeLam(1, [],
						               makeApplication(makePrimval("*"),
								               [makeLocalRef(2),
								                makeLocalRef(2)]))));
	               run(state);
	               state.pushControl(makeApplication(makeToplevel(1, 0), 
					                 [makeConstant(runtime.rational(4))]));
	               var result = run(state);
	               assert.deepEqual(result, runtime.rational(16));
	               assert.equal(state.vstack.length, 1);
	           });



        runRawTest("closure application, testing tail calls",
	           // Checking tail calling behavior
	           // The standard infinite loop should consume bounded control stack.
	           // (define (f) (f)) (begin (f)) --> infinite loop, but with bounded control stack.
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(1), []));
	               run(state);   
	               assert.equal(state.vstack.length, 1);
	               
	               state.pushControl(makeDefValues([makeToplevel(0, 0)],
					               makeLam(0, [0],
						               makeApplication(makeToplevel(0, 0),
								               []))));
	               run(state);
	               state.pushControl(makeApplication(makeToplevel(0, 0), []));
	               var MAXIMUM_BOUND = 5;
	               var ITERATIONS = 1000000;
	               for (var i = 0; i < ITERATIONS; i++) {
		           step(state);
		           assert.ok(state.cstack.length < MAXIMUM_BOUND);
	               }
	           });



        runRawTest("closure application, testing tail calls with even/odd",
	           // Checking tail calling behavior
	           // The standard infinite loop should consume bounded control stack.
	           // (define (even? x) (if (zero? x) true (odd? (sub1 x))))
	           // (define (odd? x) (if (zero? x) false (even? (sub1 x))))
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(2), []));
	               run(state);   
	               assert.equal(state.vstack.length, 1);
	               state.pushControl(makeDefValues
			                 ([makeToplevel(0, 0)],
			                  makeLam(1, [0],
				                  makeBranch(
					              makeApplication(makePrimval("zero?"),
							              [makeLocalRef(2)]),
					              makeConstant(true),
					              makeApplication(makeToplevel(1, 1),
							              [makeApplication(
							                  makePrimval("sub1"),
							                  [makeLocalRef(3)])])))));
	               state.pushControl(makeDefValues
			                 ([makeToplevel(0, 1)],
			                  makeLam(1, [0],
				                  makeBranch(
					              makeApplication(makePrimval("zero?"),
							              [makeLocalRef(2)]),
					              makeConstant(false),
					              makeApplication(makeToplevel(1, 0),
							              [makeApplication(
							                  makePrimval("sub1"),
							                  [makeLocalRef(3)])])))));
	               
	               run(state);

	               var even = function(n) {
		           state.pushControl(makeApplication(makeToplevel(1, 0),
						             [makeConstant(runtime.rational(n))]));
		           var MAXIMUM_BOUND = 10;
		           while (!state.isStuck()) {
		               step(state);
		               assert.ok(state.cstack.length < MAXIMUM_BOUND);
		               //sys.print(state.cstack.length + "\n");
		           }
		           return state.v;
	               }
	               assert.equal(even(0), true);
	               assert.equal(even(1), false);
	               assert.equal(even(50), true);
	               assert.equal(even(51), false);
	               assert.equal(even(501), false);
	               assert.equal(even(1001), false);
	               assert.equal(even(10000), true);
	               assert.equal(even(10001), false);
	           });


        runRawTest("factorial",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(1), []));
	               run(state);   
	               assert.equal(state.vstack.length, 1);
	               
	               state.pushControl(makeDefValues(
		           [makeToplevel(0, 0)],
		           makeLam(1, [0],
			           makeBranch(
			               makeApplication(makePrimval("zero?"),
					               [makeLocalRef(2)]),
			               makeConstant(runtime.rational(1)),
			               makeApplication(makePrimval("*"),
					               [makeLocalRef(3),
					                makeApplication(
						            makeToplevel(3, 0),
						            [makeApplication(makePrimval("sub1"),
								             [makeLocalRef(5)])])])))));

	               run(state);

	               var fact = function(n) {
		           state.pushControl(makeApplication(makeToplevel(1, 0),
						             [makeConstant(runtime.rational(n))]));
		           return run(state);
	               }

 	               assert.equal(fact(0), 1);
 	               assert.equal(fact(1), 1);
 	               assert.equal(fact(2), 2);
 	               assert.equal(fact(3), 6);
 	               assert.equal(fact(4), 24);
	               assert.equal(fact(5), 120);
	               assert.equal(fact(6), 720);
	               assert.equal(fact(10), 3628800);
	               assert.equal(fact(11), 39916800);
	               assert.equal(fact(12), 479001600);
	           });



        runRawTest("apply on a primitive *",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(
		           makePrimval("apply"),
		           [makePrimval("*"),
		            makeConstant(
		                runtime.list([runtime.rational(3),
				              runtime.rational(9)]))]));
	               assert.deepEqual(run(state),
			                27);
	               assert.equal(state.vstack.length, 0);
	           });



        runRawTest("apply on a primitive -",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(
		           makePrimval("apply"),
		           [makePrimval("-"),
		            makeConstant(
		                runtime.list([runtime.rational(3),
				              runtime.rational(9)]))]));
	               assert.deepEqual(run(state),
			                -6);
	               assert.equal(state.vstack.length, 0);
	           });

        runRawTest("apply on a primitive -, three arguments",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(
		           makePrimval("apply"),
		           [makePrimval("-"),
		            makeConstant(
		                runtime.list([runtime.rational(3),
				              runtime.rational(9),
				              runtime.rational(12)]))]));
	               assert.deepEqual(run(state),
			                -18);
	               assert.equal(state.vstack.length, 0);
	           });


        runRawTest("values",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(
		           makePrimval("values"),
		           [makePrimval("*"),
		            makeConstant(
		                runtime.list([runtime.rational(3),
				              runtime.rational(9),
				              runtime.rational(12)]))]));
	               var result = run(state);
	               assert.equal(state.vstack.length, 0);
	               assert.ok(result instanceof runtime.ValuesWrapper);
	               assert.equal(result.elts.length, 2);
	           });



        runRawTest("values with no arguments",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeApplication(
		           makePrimval("values"),[]));
	               var result = run(state);
	               assert.equal(state.vstack.length, 0);
	               assert.ok(result instanceof runtime.ValuesWrapper);
	               assert.equal(result.elts.length, 0);
	           });




        runRawTest("current-inexact-milliseconds",
	           function() {
	               var state = new runtime.State();
	               for (var i = 0; i < 2000; i++) {
		           state.pushControl(makeApplication(
		               makePrimval("current-inexact-milliseconds"),[]));
		           var result1 = run(state);


		           state.pushControl(makeApplication(
		               makePrimval("current-inexact-milliseconds"),[]));
		           var result2 = run(state);
		           assert.ok(runtime.lessThanOrEqual(result1, result2));
	               }
	           });




        runRawTest("values with def-values",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(2), []));
	               run(state);   
	               assert.equal(state.vstack.length, 1);
	               
	               state.pushControl(makeDefValues(
		           [makeToplevel(0, 0),
		            makeToplevel(0, 1)],
		           makeApplication(makePrimval("values"),
				           [makeConstant("hello"),
				            makeConstant("world")])));
	               run(state);
	               assert.equal(state.vstack.length, 1);
	               assert.ok(state.vstack[0] instanceof types.PrefixValue);
	               assert.equal(state.vstack[0].ref(0), "hello");
	               assert.equal(state.vstack[0].ref(1), "world");
	           });



        runRawTest("apply-values",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(2), []));
	               run(state);   
	               state.pushControl(makeDefValues(
		           [makeToplevel(0, 0),
		            makeToplevel(0, 1)],
		           makeApplication(makePrimval("values"),
				           [makeConstant(types.string("hello")),
				            makeConstant(types.string("world"))])));
	               run(state);

	               state.pushControl(makeApplyValues(
		           makeLam(2, [], makeApplication(makePrimval("string-append"),
					                  [makeLocalRef(2),
						           makeLocalRef(3)])),
		           makeApplication(makePrimval("values"),
				           [makeToplevel(2, 0),
				            makeToplevel(2, 1)])));
	               assert.deepEqual(run(state), types.string("helloworld"));
	           });



        runRawTest("apply-values, testing no stack usage",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(2), []));
	               run(state);   
	               state.pushControl(makeDefValues(
		           [makeToplevel(0, 0),
		            makeToplevel(0, 1)],
		           makeApplication(makePrimval("values"),
				           [makePrimval("zero?"),
				            makeConstant(runtime.rational(0))])));
	               run(state);

	               state.pushControl(makeApplyValues(
		           makeToplevel(0, 0),
		           makeToplevel(0, 1)));
	               assert.equal(run(state), true);
	               assert.equal(state.vstack.length, 1);
	           });

        runRawTest("let-one, trivial",
	           function() {
	               var state = new runtime.State();
	               assert.equal(state.vstack.length, 0);
	               var body = makeLocalRef(0);
	               state.pushControl(makeLet1(makeConstant("someValue"),
				                  body));
	               while (state.cstack[state.cstack.length - 1] !== body) {
		           step(state);
	               }
	               assert.equal(state.vstack.length, 1);
	               assert.equal(state.vstack[0], "someValue");
	               var result = run(state);
	               assert.equal(state.vstack.length, 0);
	               assert.deepEqual(result, "someValue");
	           });


        runRawTest("let-one, different body",
	           function() {
	               var state = new runtime.State();
	               assert.equal(state.vstack.length, 0);
	               var body = makeConstant("something else");
	               state.pushControl(makeLet1(makeConstant("someValue"),
				                  body));
	               while (state.cstack[state.cstack.length - 1] !== body) {
		           step(state);
	               }
	               assert.equal(state.vstack.length, 1);
	               assert.equal(state.vstack[0], "someValue");
	               var result = run(state);
	               assert.equal(state.vstack.length, 0);
	               assert.deepEqual(result, "something else");
	           });


        runRawTest("let-void, no boxes",
	           function() {
	               var state = new runtime.State();
	               var body = makeConstant("blah");
	               state.pushControl(makeLetVoid(2, false, body));
	               while (state.cstack[state.cstack.length - 1] !== body) {
		           step(state);
	               }
	               assert.equal(state.vstack.length, 2);
	               for(var i = 0; i < state.vstack.length; i++) {
		           assert.ok(state.vstack[i] === runtime.UNDEFINED);
	               }
	               var result = run(state);
	               assert.equal(result, "blah");
	               assert.equal(state.vstack.length, 0);
	           });


        runRawTest("let-void, with boxes",
	           function() {
	               var state = new runtime.State();
	               var body = makeConstant("blah");
	               state.pushControl(makeLetVoid(2, true, body));
	               while (state.cstack[state.cstack.length - 1] !== body) {
		           step(state);
	               }
	               assert.equal(state.vstack.length, 2);
	               for(var i = 0; i < state.vstack.length; i++) {
		           assert.ok( runtime.isBox(state.vstack[i]) );
	               }
	               var result = run(state);
	               assert.equal(result, "blah");
	               assert.equal(state.vstack.length, 0);
	           });


        runRawTest("beg0 with just one argument should immediately reduce to its argument",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeBeg0(makeConstant("first post")));
	               step(state);
	               assert.equal(state.cstack.length, 1);
	               assert.deepEqual(state.cstack[0], 
			                makeConstant("first post"));
	               var result = run(state);
	               assert.equal(result, "first post");
	           });



        runRawTest("beg0, more general",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeBeg0(makeConstant("first post"),
				                  makeConstant("second post"),
				                  makeConstant("third post"),
				                  makeConstant("fourth post")));
	               step(state);

	               // By this point, there should be two elements
	               // in the control stack, the evaluation of the first
	               // argument, and a control to continue the
	               // rest of the sequence evaluation.
	               assert.equal(state.cstack.length, 2); 
	               var result = run(state);
	               assert.equal(result, "first post");
	           });



        runRawTest("boxenv",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeLet1(makeConstant("foo"),
				                  makeBoxenv(0, 
						             makeLocalRef(0))));
	               var result = run(state);
	               assert.ok( runtime.isBox(result) );
	               assert.deepEqual(result, runtime.box("foo"));
	           });


        runRawTest("install-value, without boxes",
	           function() {
	               var state = new runtime.State();
	               var aBody = makeConstant("peep");
	               state.pushControl
		       (makeLetVoid
		        (4,
		         false,
		         makeInstallValue
		         (3, 1, false,
		          makeApplication(makePrimval("values"),
				          [makeConstant("3"),
				           makeConstant("1"),
				           makeConstant("4")]),
		          aBody)));
	               while (state.cstack[state.cstack.length - 1] !== aBody) {
		           step(state);
	               }
	               assert.equal(state.vstack.length, 4);
	               assert.equal(state.vstack[0], "4");
	               assert.equal(state.vstack[1], "1");
	               assert.equal(state.vstack[2], "3");
	               var result = run(state);
	               assert.equal(result, "peep");
	               assert.equal(state.vstack.length, 0);
	           });



        runRawTest("install-value, with boxes",
	           function() {
	               var state = new runtime.State();
	               var aBody = makeConstant("peep");
	               state.pushControl
		       (makeLetVoid
		        (4,
		         true,
		         makeInstallValue
		         (3, 1, true,
		          makeApplication(makePrimval("values"),
				          [makeConstant("3"),
				           makeConstant("1"),
				           makeConstant("4")]),
		          aBody)));
	               while (state.cstack[state.cstack.length - 1] !== aBody) {
		           step(state);
	               }
	               assert.equal(state.vstack.length, 4);
	               assert.deepEqual(state.vstack[0], runtime.box("4"));
	               assert.deepEqual(state.vstack[1], runtime.box("1"));
	               assert.deepEqual(state.vstack[2], runtime.box("3"));
	               var result = run(state);
	               assert.equal(result, "peep");
	               assert.equal(state.vstack.length, 0);
	           });


        runRawTest("assign",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(1), 
				                 [makeAssign(makeToplevel(0, 0),
						             makeConstant("some value"),
						             true)]));
	               run(state);
	               assert.equal(state.vstack.length, 1);
	               assert.equal(state.vstack[0].ref(0), "some value");
	           });


        runRawTest("varref",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(1),
				                 [makeSeq(makeAssign(makeToplevel(0, 0),
						                     makeConstant("a toplevel value"),
							             true),
					                  makeVarref(makeToplevel(0, 0)))]));
	               var result = run(state);
	               assert.ok(result instanceof runtime.VariableReference);
	               assert.equal(result.ref(), "a toplevel value");
	               result.set("something else!");
	               assert.equal(state.vstack.length, 1);
	               assert.equal(state.vstack[0].ref(0), "something else!");
	           });


        runRawTest("closure",
	           function() {
	               var state = new runtime.State();
	               state.heap['some-closure'] = 42;
	               state.pushControl(makeClosure('some-closure'));
	               // The way we process closures in bytecode-compiler
	               // should make this a direct heap lookup.
	               assert.equal(run(state), 42);
	           });


        runRawTest("with-cont-mark", 
	           function() {
	               var state = new runtime.State();
	               var aBody = makeConstant("peep");
	               state.pushControl
		       (makeWithContMark(makeConstant
				         (runtime.symbol("x")),
				         makeConstant("42"),
				         aBody));
	               while (state.cstack[state.cstack.length -1] !== aBody) {
		           step(state);
	               }
	               assert.equal(state.cstack.length, 2);
	               assert.ok( types.isContMarkRecordControl(state.cstack[0]) );
	               assert.equal(state.cstack[0].dict.get(types.symbol('x')),
			            "42");
	               var result = run(state);
	               assert.equal(result, "peep");
	           });




        runRawTest("closure application, testing tail calls in the presence of continuation marks",
	           // Checking tail calling behavior
	           // The standard infinite loop should consume bounded control stack.
	           // (define (f) (call-with-continuation-marks 'x 1 (f))) (begin (f)) --> infinite loop, but with bounded control stack.
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeMod(makePrefix(1), []));
	               run(state);   
	               assert.equal(state.vstack.length, 1);
	               
	               state.pushControl(makeDefValues([makeToplevel(0, 0)],
					               makeLam(0, [0],
						               (makeWithContMark
						                (makeConstant(runtime.symbol("x")),
						                 makeConstant(runtime.rational(1)),
						                 
						                 makeApplication(makeToplevel(0, 0),
								                 []))))));
	               run(state);
	               state.pushControl(makeApplication(makeToplevel(0, 0), []));
	               var MAXIMUM_BOUND = 6;
	               var ITERATIONS = 1000000;
	               for (var i = 0; i < ITERATIONS; i++) {
		           step(state);
		           assert.ok(state.cstack.length < MAXIMUM_BOUND);
	               }
	           });


        runRawTest("case-lambda, with a function that consumes one or two values",
	           function() {
	               var state = new runtime.State();
	               state.pushControl
		       (makeMod(makePrefix(1), 
			        [makeDefValues
			         ([makeToplevel(0, 0)],
			          makeCaseLam(runtime.symbol("last"),
				              [makeLam(1, [], makeLocalRef(0)),
					       makeLam(2, [], makeLocalRef(1))]))]));
	               run(state);
	               state.pushControl(makeApplication(makeToplevel(1, 0),
					                 [makeConstant(runtime.rational(5))]));
	               var result = run(state);
	               assert.deepEqual(result, runtime.rational(5));

	               state.pushControl(makeApplication(makeToplevel(2, 0),
					                 [makeConstant(runtime.rational(7)),
					                  makeConstant(runtime.rational(42))]));
	               result = run(state);
	               assert.deepEqual(result, runtime.rational(42));
	           });



        // runRawTest("factorial again, testing the accumulation of continuation marks",
        // 	//
        // 	// (define marks #f)
        // 	// (define (f x)
        // 	//   (with-continuation-marks 'x x
        // 	//     (if (= x 0)
        // 	//         (begin (set! marks (current-continuation-marks))
        // 	//                1)
        // 	//         (* x (f (sub1 x))))))
        // 	function() {

        // 	});


        runRawTest("let-rec",
	           function() {
	               var state = new runtime.State();
	               state.pushControl(makeLetVoid(2,
					             false,
					             makeLetrec([makeLam(1, [0],
							                 makeBranch
							                 (makeApplication(makePrimval("zero?"),
									                  [makeLocalRef(2)]),
							                  makeConstant(true),
							                  makeApplication(makeLocalRef(1),
									                  [makeApplication
										           (makePrimval("sub1"),
										            [makeLocalRef(3)])]))),
						                 makeLam(1, [1],
							                 makeBranch
							                 (makeApplication(makePrimval("zero?"),
									                  [makeLocalRef(2)]),
							                  makeConstant(false),
							                  makeApplication(makeLocalRef(1),
									                  [makeApplication
										           (makePrimval("sub1"),
										            [makeLocalRef(3)])])))],
						                makeLocalRef(1))));
	               var evenValue = run(state);
	               var e = function(x) {
		           state.pushControl(makeApplication(makeConstant(evenValue),
						             [makeConstant(runtime.rational(x))]));
		           return run(state);
	               }
	               assert.equal(state.vstack.length, 0);

	               assert.equal(e(0), true);
	               assert.equal(e(1), false);
	               assert.equal(e(2), true);
	               assert.equal(e(3), false);
	               assert.equal(e(100), true);
	               assert.equal(e(101), false);
	               assert.equal(e(10000), true);
	               assert.equal(e(10001), false);
	           });


        /***************************************
         *** Primitive String Function Tests ***
         ***************************************/

        runRawTest('symbol?',
	           function() {
		       testPrim('symbol?', runtime.symbol, ['hi'], true);
		       testPrim('symbol?', runtime.rational, [1], false);
	           });

        runRawTest('symbol=?',
	           function() {
		       testPrim('symbol=?', runtime.symbol, ['abc', 'abd'], false);
		       testPrim('symbol=?', runtime.symbol, ['cdf', 'cdf'], true);
	           });

        runRawTest('string->symbol',
	           function() {
		       testPrim('string->symbol', id, ['hello!'], runtime.symbol('hello!'));
		       testPrim('string->symbol', runtime.string, [' world'], runtime.symbol(' world'));
	           });


        runRawTest('symbol->string',
	           function() {
		       testPrim('symbol->string', runtime.symbol, ['hello!'], runtime.string('hello!'));
	           });


        runRawTest('number->string',
	           function() {
		       testPrim('number->string', runtime.rational, [5], runtime.string('5'));
		       testPrim('number->string', id, [runtime.complex(0, 2)], runtime.string('0+2i'));
		       testPrim('number->string', id, [runtime.rational(5, 3)], runtime.string('5/3'));
	           });


        runRawTest('stinrg->number',
	           function() {
		       testPrim('string->number', runtime.string, ['abc'], false);
		       testPrim('string->number', id, ['123'], 123);
		       testPrim('string->number', runtime.string, ['0+3i'], runtime.complex(0, 3));
	           });


        runRawTest('string?',
	           function() {
		       testPrim('string?', id, [runtime.symbol('hello!')], false);
		       testPrim('string?', id, ['string'], true);
		       testPrim('string?', runtime.string, ['world'], true);
	           });


        runRawTest('make-string',
	           function() {
		       testPrim('make-string', id, [0, runtime.char('A')], runtime.string(""));
		       testPrim('make-string', id, [runtime.rational(3), runtime.char('b')], runtime.string('bbb'));
	           });


        runRawTest('string',
	           function() {
		       testPrim('string', id, [], runtime.string(''));
		       testPrim('string', runtime.char, ['a', 'b'], runtime.string('ab'));
	           });

        runRawTest('string-length',
	           function() {
		       testPrim('string-length', runtime.string, [''], 0);
		       testPrim('string-length', id, ['5'], 1);
		       testPrim('string-length', runtime.string, ['antidisestablishmentarianism'], 28);
	           });

        runRawTest('string-ref',
	           function() {
		       testPrim('string-ref', id, ['world', 3], runtime.char('l'));
		       testPrim('string-ref', id, [runtime.string('abcd'), 1], runtime.char('b'));
		       testPrim('string-ref', id, [runtime.string('asdfasdf'), 4], runtime.char('a'));
	           });

        runRawTest('string=?',
	           function() {
		       testPrim('string=?', id, ['asdf', 'Asdf'], false);
		       testPrim('string=?', id, ['asdf', runtime.string('asdf')], true);
		       testPrim('string=?', runtime.string, ['asdf', 'asdf', 'Asdf'], false);
		       testPrim('string=?', runtime.string, ['far', 'fAr'], false);
		       testPrim('string=?', id, ['', ''], true);
		       testPrim('string=?', runtime.string, ['as', 'as', 'as'], true);
		       testPrim('string=?', runtime.string, ['1', '1', '2'], false);
	           });

        runRawTest('string-ci=?',
	           function() {
		       testPrim('string-ci=?', id, ['asdf', 'Asdf'], true);
		       testPrim('string-ci=?', id, ['asdf', runtime.string('asdf')], true);
		       testPrim('string-ci=?', runtime.string, ['asdf', 'asdf', 'Asdf'], true);
		       testPrim('string-ci=?', runtime.string, ['far', 'fAr'], true);
		       testPrim('string-ci=?', id, ['', ''], true);
		       testPrim('string-ci=?', runtime.string, ['as', 'as', 'as'], true);
		       testPrim('string-ci=?', runtime.string, ['1', '1', '2'], false);
	           });

        runRawTest('string<?',
	           function() {
		       testPrim('string<?', id, ["", "a"], true);
		       testPrim('string<?', runtime.string, ['abc', 'ab'], false);
		       testPrim('string<?', id, [runtime.string('abc'), 'abc'], false);
		       testPrim('string<?', runtime.string, ['abc', 'def', 'cde'], false);
		       testPrim('string<?', id, ['A', runtime.string(']'), 'a'], true);
		       testPrim('string<?', runtime.string, ['a', 'b', 'c', 'd', 'dd', 'e'], true);
	           });

        runRawTest('string>?',
	           function() {
		       testPrim('string>?', id, ["", "a"], false);
		       testPrim('string>?', runtime.string, ['abc', 'ab'], true);
		       testPrim('string>?', id, [runtime.string('abc'), 'abc'], false);
		       testPrim('string>?', runtime.string, ['abc', 'def', 'cde'], false);
		       testPrim('string>?', id, ['a', runtime.string(']'), 'A'], true);
		       testPrim('string>?', runtime.string, ['e', 'd', 'cc', 'c', 'b', 'a'], true);
	           });

        runRawTest('string<=?',
	           function() {
		       testPrim('string<=?', id, ["", "a"], true);
		       testPrim('string<=?', runtime.string, ['abc', 'ab'], false);
		       testPrim('string<=?', id, [runtime.string('abc'), 'abc'], true);
		       testPrim('string<=?', runtime.string, ['abc', 'aBc'], false);
		       testPrim('string<=?', runtime.string, ['abc', 'def', 'cde'], false);
		       testPrim('string<=?', id, ['A', runtime.string(']'), 'a'], true);
		       testPrim('string<=?', runtime.string, ['a', 'b', 'b', 'd', 'dd', 'e'], true);
	           });

        runRawTest('string>=?',
	           function() {
		       testPrim('string>=?', id, ["", "a"], false);
		       testPrim('string>=?', runtime.string, ['abc', 'ab'], true);
		       testPrim('string>=?', id, [runtime.string('abc'), 'abc'], true);
		       testPrim('string>=?', runtime.string, ['aBc', 'abc'], false);
		       testPrim('string>=?', runtime.string, ['abc', 'def', 'cde'], false);
		       testPrim('string>=?', id, ['a', runtime.string(']'), 'A'], true);
		       testPrim('string>=?', runtime.string, ['e', 'e', 'cc', 'c', 'b', 'a'], true);
	           });

        runRawTest('string-ci<?',
	           function() {
		       testPrim('string-ci<?', id, ["", "a"], true);
		       testPrim('string-ci<?', id, [runtime.string('Abc'), 'ab'], false);
		       testPrim('string-ci<?', runtime.string, ['abc', 'abc'], false);
		       testPrim('string-ci<?', runtime.string, ['abc', 'def', 'cde'], false);
		       testPrim('string-ci<?', runtime.string, ['a', 'b', 'C', 'd', 'dd', 'e'], true);
	           });

        runRawTest('string-ci>?',
	           function() {
		       testPrim('string-ci>?', id, ["", "a"], false);
		       testPrim('string-ci>?', id, [runtime.string('Abc'), 'ab'], true);
		       testPrim('string-ci>?', runtime.string, ['abc', 'abc'], false);
		       testPrim('string-ci>?', runtime.string, ['def', 'abc', 'cde'], false);
		       testPrim('string-ci>?', runtime.string, ['e', 'D', 'cc', 'c', 'b', 'a'], true);
	           });

        runRawTest('string-ci<=?',
	           function() {
		       testPrim('string-ci<=?', id, ["", "a"], true);
		       testPrim('string-ci<=?', runtime.string, ['Abc', 'ab'], false);
		       testPrim('string-ci<=?', id, [runtime.string('abc'), 'abc'], true);
		       testPrim('string-ci<=?', runtime.string, ['abc', 'aBc'], true);
		       testPrim('string-ci<=?', runtime.string, ['abc', 'def', 'cde'], false);
		       testPrim('string-ci<=?', runtime.string, ['a', 'b', 'b', 'D', 'dd', 'e'], true);
	           });

        runRawTest('string-ci>=?',
	           function() {
		       testPrim('string-ci>=?', id, ["", "a"], false);
		       testPrim('string-ci>=?', runtime.string, ['Abc', 'ab'], true);
		       testPrim('string-ci>=?', id, [runtime.string('abc'), 'abc'], true);
		       testPrim('string-ci>=?', runtime.string, ['aBc', 'abc'], true);
		       testPrim('string-ci>=?', runtime.string, ['def', 'abc', 'cde'], false);
		       testPrim('string-ci>=?', runtime.string, ['e', 'e', 'cc', 'C', 'b', 'a'], true);
	           });


        runRawTest('substring',
	           function() {
		       testPrim('substring', id, ['abc', 1], runtime.string('bc'));
		       testPrim('substring', id, [runtime.string('abc'), 0], runtime.string('abc'));
		       testPrim('substring', id, ['abcdefgh', 2, 4], runtime.string('cd'));
		       testPrim('substring', id, [runtime.string('abc'), 3], runtime.string(''));
		       testPrim('substring', id, [runtime.string('abcd'), 2, 2], runtime.string(''));
	           });


        runRawTest('string-append',
	           function() {
		       testPrim('string-append', runtime.string, [], runtime.string(''));
		       testPrim('string-append', id, ['a', runtime.string('b'), 'c'], runtime.string('abc'));
		       testPrim('string-append', runtime.string, ['a', '', 'b', ' world'], runtime.string('ab world'));
	           });


        runRawTest('string->list',
	           function() {
		       testPrim('string->list', runtime.string, [''], runtime.EMPTY);
		       testPrim('string->list', id, ['one'], runtime.list([runtime.char('o'), runtime.char('n'), runtime.char('e')]));
		       testPrim('string->list', runtime.string, ['two'], runtime.list([runtime.char('t'),
										       runtime.char('w'),
										       runtime.char('o')]));
	           });

        runRawTest('list->string',
	           function() {
		       testPrim('list->string', id, [runtime.EMPTY], runtime.string(''));
		       testPrim('list->string', id,
			        [runtime.list([runtime.char('H'),
					       runtime.char('e'),
					       runtime.char('l'),
					       runtime.char('l'),
					       runtime.char('o')])],
			        runtime.string('Hello'));
	           });


        runRawTest('string-copy',
	           function() {
		       testPrim('string-copy', runtime.string, [''], runtime.string(''));
		       testPrim('string-copy', id, ['had'], runtime.string('had'));
		       testPrim('string-copy', runtime.string, ['hello'], runtime.string('hello'));

		       var state = new runtime.State();
		       var str = runtime.string('hello');
		       state.pushControl(makeApplication(makePrimval('string-copy'), [makeConstant(str)]));
		       var result = run(state);
		       assert.deepEqual(result, str);
		       assert.ok(result !== str);
	           });


        runRawTest('format',
	           function() {
		       testPrim('format', runtime.string, ['hello'], runtime.string('hello'));
		       testPrim('format', id, ['hello~n'], runtime.string('hello\n'));
		       testPrim('format', id, [runtime.string('Test: ~a~nTest2: ~A~%'),
		          		       runtime.char('A'),
		          		       runtime.list([1, 2, 3])],
		                runtime.string('Test: A\nTest2: (list 1 2 3)\n'));
		       testPrim('format', id, ['~s ~S ~a',
		         		       runtime.char('b'),
		         		       runtime.complex(0, 2),
		         		       runtime.char('b')],
		                runtime.string('#\\b 0+2i b'));
                       
		       testPrim('format', id, ['~s ~a', primitive.getPrimitive('+'), primitive.getPrimitive('format')],
		                runtime.string('#<procedure:+> #<procedure:format>'));
		       
		       var box1 = types.box('junk');
		       var box2 = types.box(box1);
		       box1.set(box2);
		       testPrim('format', id, ['~s', box1], runtime.string('#&#&...'));
		       
		       var box3 = types.box('junk');
		       box3.set(box3);
		       testPrim('format', id, ['~a', box3], runtime.string('#&...'));
	           });




        runRawTest('explode',
	           function() {
		       testPrim('explode', id, [''], runtime.EMPTY);
		       testPrim('explode', runtime.string, ['hello'], runtime.list([runtime.string('h'),
									            runtime.string('e'),
									            runtime.string('l'),
									            runtime.string('l'),
									            runtime.string('o')]));
	           });


        runRawTest('implode',
	           function() {
		       testPrim('implode', id, [runtime.EMPTY], runtime.string(''));
		       testPrim('implode', runtime.list, [[runtime.string('h'),
						           runtime.string('e'),
						           runtime.string('l'),
						           runtime.string('l'),
						           runtime.string('o')]],
			        runtime.string('hello'));
	           });


        runRawTest('string->int',
	           function() {
		       testPrim('string->int', runtime.string, ['0'], 48);
		       testPrim('string->int', runtime.string, ['\n'], 10);
	           });


        runRawTest('int->string',
	           function() {
		       testPrim('int->string', id, [50], runtime.string('2'));
		       testPrim('int->string', id, [10], runtime.string('\n'));
	           });


        runRawTest('string-alphabetic?',
	           function() {
		       testPrim('string-alphabetic?', id, ['abcd'], true);
		       testPrim('string-alphabetic?', runtime.string, ['AbCZ'], true);
		       testPrim('string-alphabetic?', id, ['a b c'], false);
		       testPrim('string-alphabetic?', runtime.string, ['1243!'], false);
	           });


        runRawTest('string-ith',
	           function() {
		       testPrim('string-ith', id, ['abcde', 2], runtime.string('c'));
		       testPrim('string-ith', id, [runtime.string('12345'), 0], runtime.string('1'));
	           });


        runRawTest('string-lower-case?',
	           function() {
		       testPrim('string-lower-case?', runtime.string, ['abcd'], true);
		       testPrim('string-lower-case?', id, ['abc1'], false);
		       testPrim('string-lower-case?', runtime.string, ['Abc'], false);
	           });


        runRawTest('string-numeric?',
	           function() {
		       testPrim('string-numeric?', id, ['1234'], true);
		       testPrim('string-numeric?', runtime.string, ['5432'], true);
		       testPrim('string-numeric?', runtime.string, ['0+2i'], false);
		       testPrim('string-numeric?', runtime.string, ['03()'], false);
	           });


        runRawTest('string-upper-case?',
	           function() {
		       testPrim('string-upper-case?', id, ['ABCD'], true);
		       testPrim('string-upper-case?', runtime.string, ['ADF'], true);
		       testPrim('string-upper-case?', runtime.string, ['AbZ'], false);
		       testPrim('string-upper-case?', runtime.string, ['05AB'], false);
	           });


        runRawTest('string-whitespace?',
	           function() {
		       testPrim('string-whitespace?', runtime.string, ['a b c'], false);
		       testPrim('string-whitespace?', id, [' \n '], true);
		       testPrim('string-whitespace?', runtime.string, ['\t\r\n '], true);
	           });


        runRawTest('replicate',
	           function() {
		       testPrim('replicate', id, [3, runtime.string('ab')], runtime.string('ababab'))
		       testPrim('replicate', id, [0, 'hi'], runtime.string(''));
		       testPrim('replicate', id, [50, runtime.string('')], runtime.string(''));
	           });


        runRawTest('string->immutable-string',
	           function() {
		       testPrim('string->immutable-string', id, ['hello'], 'hello');
		       testPrim('string->immutable-string', runtime.string, ['world'], 'world');
	           });


        runRawTest('string-set!',
	           function() {
		       var str1 = runtime.string('hello');
		       testPrim('string-set!', id, [str1, 2, runtime.char('w')], runtime.VOID);
		       assert.deepEqual(str1, runtime.string('hewlo'));

		       var str2 = runtime.string('no');
		       testPrim('string-set!', id, [str2, 1, runtime.char('!')], runtime.VOID);
		       assert.deepEqual(str2, runtime.string('n!'));
	           });


        runRawTest('string-fill!',
	           function() {
		       var str1 = runtime.string('lawl');
		       testPrim('string-fill!', id, [str1, runtime.char('q')], runtime.VOID);
		       assert.deepEqual(str1, runtime.string('qqqq'));

		       var str2 = runtime.string('');
		       testPrim('string-fill!', id, [str2, runtime.char(' ')], runtime.VOID);
		       assert.deepEqual(str2, runtime.string(''));
	           });



        /*************************************
         *** Primitive Math Function Tests ***
         *************************************/


        runRawTest("zero?",
	           function() {
		       testPrim('zero?', runtime.rational, [0], true);
		       testPrim('zero?', runtime.rational, [1], false);
		       testPrim('zero?', id, [runtime.complex(0, 1)], false);
	           });



        runRawTest("sub1",
	           function() {
		       testPrim('sub1', runtime.rational, [25], runtime.rational(24));
		       testPrim('sub1', id, [runtime.complex(3, 5)], runtime.complex(2, 5));
	           });


        runRawTest("add1",
	           function() {
		       testPrim('add1', runtime.rational, [25], runtime.rational(26));
		       testPrim('add1', id, [runtime.complex(3, 5)], runtime.complex(4, 5));
	           });


        runRawTest("+",
	           function() {
		       testPrim('+', runtime.rational, [], runtime.rational(0));
		       testPrim('+', runtime.rational, [2], runtime.rational(2));
		       testPrim('+', runtime.rational, [1, 2], runtime.rational(3));
		       testPrim('+', runtime.rational, [1, 2, 3, 4], runtime.rational(10));
	           });


        runRawTest("-",
	           function() {
		       testPrim('-', runtime.rational, [2], runtime.rational(-2));
		       testPrim('-', runtime.rational, [1, 2], runtime.rational(-1));
		       testPrim('-', runtime.rational, [1, 2, 3, 4], runtime.rational(-8));
	           });


        runRawTest("*",
	           function() {
		       testPrim('*', runtime.rational, [], runtime.rational(1));
		       testPrim('*', runtime.rational, [2], runtime.rational(2));
		       testPrim('*', runtime.rational, [1, 2], runtime.rational(2));
		       testPrim('*', runtime.rational, [1, 2, 3, 4], runtime.rational(24));
	           });


        runRawTest("/",
	           function() {
		       testPrim('/', runtime.rational, [2], runtime.rational(1, 2));
		       testPrim('/', runtime.rational, [1, 3], runtime.rational(1, 3));
		       testPrim('/', runtime.rational, [18, 2, 3, 4], runtime.rational(3, 4));
	           });


        runRawTest('abs',
	           function() {
		       testPrim('abs', runtime.rational, [2], runtime.rational(2));
		       testPrim('abs', runtime.rational, [0], runtime.rational(0));
		       testPrim('abs', runtime.rational, [-2], runtime.rational(2));
	           });


        runRawTest('quotient',
	           function() {
		       testPrim('quotient', runtime.rational, [5, 3], runtime.rational(1));
	           });


        runRawTest('remainder',
	           function() {
		       testPrim('remainder', runtime.rational, [5, 3], runtime.rational(2));
	           });


        runRawTest('modulo',
	           function() {
	               testPrim('modulo', runtime.rational, [-5, 3], runtime.rational(1));
	           });


        runRawTest('=',
	           function() {
	               testPrim('=', runtime.rational, [2, 3], false);
	               testPrim('=', runtime.rational, [2, 2, 2, 2], true);
	               testPrim('=', runtime.rational, [2, 2, 3, 3], false);
	           });


        runRawTest('<',
	           function() {
	               testPrim('<', runtime.rational, [1, 2], true);
	               testPrim('<', runtime.rational, [2, 2], false);
	               testPrim('<', runtime.rational, [3, 2], false);
	               testPrim('<', runtime.rational, [1, 2, 3, 4], true);
	               testPrim('<', runtime.rational, [1, 2, 2, 3], false);
	               testPrim('<', runtime.rational, [1, 3, 5, 4], false);
	           });


        runRawTest('>',
	           function() {
	               testPrim('>', runtime.rational, [1, 2], false);
	               testPrim('>', runtime.rational, [2, 2], false);
	               testPrim('>', runtime.rational, [3, 2], true);
	               testPrim('>', runtime.rational, [4, 3, 2, 1], true);
	               testPrim('>', runtime.rational, [4, 3, 3, 2], false);
	               testPrim('>', runtime.rational, [4, 3, 5, 2], false);
	           });


        runRawTest('<=',
	           function() {
	               testPrim('<=', runtime.rational, [1, 2], true);
	               testPrim('<=', runtime.rational, [2, 2], true);
	               testPrim('<=', runtime.rational, [3, 2], false);
	               testPrim('<=', runtime.rational, [1, 2, 3, 4], true);
	               testPrim('<=', runtime.rational, [2, 3, 3, 3], true);
	               testPrim('<=', runtime.rational, [1, 3, 5, 4], false);
	           });


        runRawTest('>=',
	           function() {
	               testPrim('>=', runtime.rational, [1, 2], false);
	               testPrim('>=', runtime.rational, [2, 2], true);
	               testPrim('>=', runtime.rational, [3, 2], true);
	               testPrim('>=', runtime.rational, [4, 3, 2, 1], true);
	               testPrim('>=', runtime.rational, [4, 3, 3, 2], true);
	               testPrim('>=', runtime.rational, [5, 3, 5, 4], false);
	           });


        runRawTest('positive?',
	           function() {
		       testPrim('positive?', runtime.rational, [-1], false);
		       testPrim('positive?', runtime.rational, [0], false);
		       testPrim('positive?', runtime.rational, [1], true);
	           });


        runRawTest('negative?',
	           function() {
		       testPrim('negative?', runtime.rational, [-1], true);
		       testPrim('negative?', runtime.rational, [0], false);
		       testPrim('negative?', runtime.rational, [1], false);
	           });


        runRawTest('max',
	           function() {
		       testPrim('max', runtime.rational, [1], runtime.rational(1));
		       testPrim('max', runtime.rational, [1, 2], runtime.rational(2));
		       testPrim('max', runtime.rational, [2, 1, 4, 3, 6, 2], runtime.rational(6));
	           });


        runRawTest('min',
	           function() {
		       testPrim('min', runtime.rational, [1], runtime.rational(1));
		       testPrim('min', runtime.rational, [1, 2], runtime.rational(1));
		       testPrim('min', runtime.rational, [2, 1, 4, 3, 6, 2], runtime.rational(1));
	           });


        runRawTest('=~',
	           function() {
		       testPrim('=~', id, [1, 2, 2], true);
		       testPrim('=~', id, [1, 2, runtime.float(0.5)], false);
		       testPrim('=~', runtime.rational, [5, 3, 1], false);
		       testPrim('=~', runtime.rational, [5, 3, 4], true);
	           });


        runRawTest('conjugate',
	           function() {
		       testPrim('conjugate', id, [1], 1);
		       testPrim('conjugate', id, [runtime.complex(3, 3)], runtime.complex(3, -3));
	           });


        runRawTest('magnitude',
	           function() {
		       testPrim('magnitude', id, [4], 4);
		       testPrim('magnitude', id, [runtime.complex(3, 4)], 5);
		       testPrim('magnitude', id, [runtime.float(3.5)], runtime.float(3.5));
		       testPrim('magnitude', id, [runtime.rational(3, 5)], runtime.rational(3, 5));
		       testPrim('magnitude', id, [runtime.complex(12, 5)], 13);
	           });


        runRawTest('number?',
	           function() {
		       testPrim('number?', id, [5], true);
		       testPrim('number?', runtime.rational, [10], true);
		       testPrim('number?', id, [runtime.rational(10, 3)], true);
		       testPrim('number?', runtime.float, [10.5], true);
		       testPrim('number?', id, [runtime.complex(5, 3)], true);
		       testPrim('number?', id, ['string'], false);
	           });


        runRawTest('complex?',
	           function() {
		       testPrim('complex?', id, [5], true);
		       testPrim('complex?', runtime.rational, [10], true);
		       testPrim('complex?', id, [runtime.rational(10, 3)], true);
		       testPrim('complex?', runtime.float, [10.5], true);
		       testPrim('complex?', id, [runtime.complex(5, 3)], true);
		       testPrim('complex?', id, ['string'], false);
	           });


        runRawTest('real?',
	           function() {
		       testPrim('real?', id, [5], true);
		       testPrim('real?', runtime.rational, [10], true);
		       testPrim('real?', id, [runtime.rational(10, 3)], true);
		       testPrim('real?', runtime.float, [10.5], true);
		       testPrim('real?', id, [runtime.complex(5, 3)], false);
		       testPrim('real?', id, ['string'], false);
	           });


        runRawTest('rational?',
	           function() {
		       testPrim('rational?', id, [5], true);
		       testPrim('rational?', runtime.rational, [10], true);
		       testPrim('rational?', id, [runtime.rational(10, 3)], true);
		       testPrim('rational?', runtime.float, [10.5], true);
		       testPrim('rational?', runtime.float, [Math.sqrt(2)], true);
		       testPrim('rational?', id, [runtime.complex(5, 3)], false);
		       testPrim('rational?', id, ['string'], false);
	           });


        runRawTest('integer?',
	           function() {
		       testPrim('integer?', id, [5], true);
		       testPrim('integer?', runtime.rational, [10], true);
		       testPrim('integer?', id, [runtime.complex(5, 0)], true);
		       testPrim('integer?', id, [runtime.rational(10, 3)], false);
		       testPrim('integer?', runtime.float, [10.5], false);
		       testPrim('integer?', id, [runtime.complex(5, 3)], false);
		       testPrim('integer?', id, ['string'], false);
	           });


        runRawTest('exact?',
	           function() {
		       testPrim('exact?', id, [5], true);
		       testPrim('exact?', id, [runtime.rational(4, 3)], true);
		       testPrim('exact?', runtime.float, [10.0], false);
		       testPrim('exact?', id, [runtime.complex(5, 2)], true);
		       testPrim('exact?', id, [runtime.complex(runtime.float(5.2), runtime.float(0.1))], false);
	           });


        runRawTest('inexact?',
	           function() {
		       testPrim('inexact?', id, [5], false);
		       testPrim('inexact?', id, [runtime.rational(4, 3)], false);
		       testPrim('inexact?', runtime.float, [10.0], true);
		       testPrim('inexact?', id, [runtime.complex(5, 2)], false);
		       testPrim('inexact?', id, [runtime.complex(runtime.float(5.2), runtime.float(0.1))], true);
	           });


        runRawTest('odd? and even?',
	           function() {
		       testPrim('odd?', id, [5], true);
		       testPrim('odd?', runtime.float, [10.0], false);
		       testPrim('even?', id, [15], false);
		       testPrim('even?', runtime.float, [13.0], false);
	           });


        runRawTest('gcd and lcm',
	           function() {
		       testPrim('gcd', id, [1001, 98], 7);
		       testPrim('gcd', id, [6, 10, 15], 1);
		       testPrim('lcm', id, [91, 77], 1001);
		       testPrim('lcm', id, [6, 10, 15], 30);
	           });


        runRawTest('floor, ceiling, and round',
	           function() {
		       testPrim('floor', id, [14], 14);
		       testPrim('floor', runtime.float, [12.56], runtime.float(12));
		       testPrim('ceiling', id, [13], 13);
		       testPrim('ceiling', runtime.float, [12.23], runtime.float(13));
		       testPrim('ceiling', runtime.float, [12.00], runtime.float(12.0));
		       testPrim('round', id, [124], 124);
		       testPrim('round', runtime.float, [12.432], runtime.float(12));
		       testPrim('round', runtime.float, [12.543], runtime.float(13));
	           });


        runRawTest('numerator and denominator',
	           function() {
		       testPrim('numerator', id, [30], 30);
		       testPrim('numerator', id, [runtime.rational(10, -2)], -5);
		       testPrim('numerator', runtime.float, [10.5], runtime.float(21));
		       testPrim('numerator', runtime.float, [-2.53], runtime.float(-253));
		       testPrim('denominator', id, [43], 1);
		       testPrim('denominator', id, [runtime.rational(12, 4)], 1);
		       testPrim('denominator', id, [runtime.rational(23, -5)], 5);
		       testPrim('denominator', runtime.float, [12.125], runtime.float(8));
		       testPrim('denominator', runtime.float, [-2.53], runtime.float(100));
	           });


        runRawTest('exp and log',
	           function() {
		       testPrim('exp', id, [0], 1);
		       testPrim('exp', runtime.float, [0], runtime.float(1));
		       testPrim('exp', id, [3], runtime.float(Math.exp(3)));
		       testPrim('log', id, [1], 0);
		       testPrim('log', runtime.float, [1], runtime.float(0));
		       testPrim('log', id, [primitive.getPrimitive('e')], runtime.float(1));
	           });


        runRawTest('sin, cos, tan, asin, acos, atan',
	           function() {
		       testPrim('sin', id, [20], runtime.float(Math.sin(20)));
		       testPrim('sin', id, [0], 0);
		       testPrim('cos', id, [0], 1);
		       testPrim('cos', runtime.float, [43], runtime.float(Math.cos(43)));
		       testPrim('tan', runtime.float, [0], runtime.float(0));
		       testPrim('tan', id, [-30], runtime.float(Math.tan(-30)));

		       testPrim('asin', runtime.float, [-0.5], runtime.float(Math.asin(-0.5)));
		       testPrim('acos', runtime.float, [0.53], runtime.float(Math.acos(0.53)));
		       testPrim('atan', runtime.float, [-543], runtime.float(Math.atan(-543)));
	           });


        runRawTest('sqrt, integer-sqrt, and expt',
	           function() {
		       testPrim('sqrt', id, [25], 5);
		       testPrim('sqrt', runtime.float, [1.44], runtime.float(1.2));
		       testPrim('sqrt', id, [-1], runtime.complex(0, 1));
		       testPrim('sqrt', id, [runtime.complex(0, 2)], runtime.complex(1, 1));
		       testPrim('sqrt', id, [runtime.complex(runtime.float(0), runtime.float(-2))],
			        runtime.complex(runtime.float(1), runtime.float(-1)));

		       testPrim('integer-sqrt', id, [15], 3);
		       testPrim('integer-sqrt', id, [88], 9);

		       testPrim('expt', id, [2, 20], 1048576);
		       testPrim('expt', id, [3, 3], 27);
		       testPrim('expt', runtime.float, [12.4, 5.43], runtime.float(Math.pow(12.4, 5.43)));
	           });


        runRawTest('make-rectangular, make-polar, real-part, imag-part, angle',
	           function() {
		       testPrim('make-rectangular', id, [5, 3], runtime.complex(5, 3));
		       testPrim('make-rectangular', id, [5, runtime.float(4)],
			        runtime.complex(runtime.float(5), runtime.float(4)));
		       
		       testPrim('make-polar', id, [1, 0], runtime.complex(1, 0));
		       testPrimF('make-polar', runtime.float, [5, Math.PI/2], true,
			         function(res) {
			             return (jsnums.isInexact(res) &&
				             Math.abs(jsnums.toFixnum(jsnums.realPart(res))) < 0.000001 &&
				             Math.abs(jsnums.toFixnum(jsnums.imaginaryPart(res)) - 5) < 0.0000001);
			         });

		       testPrim('real-part', id, [14], 14);
		       testPrim('real-part', runtime.float, [4], runtime.float(4));
		       testPrim('real-part', id, [runtime.complex(0, 1)], 0);
		       testPrim('real-part', id, [runtime.complex(runtime.float(1.44), runtime.float(5))], runtime.float(1.44));

		       testPrim('imag-part', id, [14], 0);
		       testPrim('imag-part', runtime.float, [4], 0);
		       testPrim('imag-part', id, [runtime.complex(0, 1)], 1);
		       testPrim('imag-part', id, [runtime.complex(runtime.float(1.44), runtime.float(5))], runtime.float(5));

		       testPrim('angle', id, [runtime.complex(3, 0)], 0);
		       testPrim('angle', runtime.float, [4.46], 0);
		       testPrim('angle', id, [-54], runtime.float(Math.PI));
		       testPrimF('angle', id, [runtime.complex(1, 1)], true,
		                 function(res) {
			             return (jsnums.isInexact(res) &&
				             Math.abs(jsnums.toFixnum(res) - Math.PI/4) < 0.0000001);
			         });
	           });


        runRawTest('exact->inexact and inexact->exact',
	           function() {
		       testPrim('exact->inexact', id, [5], runtime.float(5));
		       testPrim('exact->inexact', runtime.float, [5.2], runtime.float(5.2));
		       testPrim('exact->inexact', id, [runtime.rational(2, 3)], runtime.float(2/3));
		       testPrim('exact->inexact', id, [runtime.complex(3, 5)], runtime.complex(runtime.float(3), runtime.float(5)));

		       testPrim('inexact->exact', runtime.float, [0], 0);
		       testPrim('inexact->exact', runtime.float, [1.25], runtime.rational(5, 4));
		       testPrim('inexact->exact', id, [5], 5);
		       testPrim('inexact->exact', id, [runtime.complex(5, 3)], runtime.complex(5, 3));
		       testPrim('inexact->exact', id, [runtime.complex(runtime.float(5.2), runtime.float(4))],
			        runtime.complex(runtime.rational(26, 5), 4));
	           });


        runRawTest('first, second, third, fourth, fifth, sixth, seventh, eighth',
	           function() {
		       var testList1 = runtime.list([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		       var testList2 = runtime.list([runtime.list([1, 2]),
					             runtime.list([3, 4]),
					             runtime.list([5, 6]),
					             runtime.list([7, 8]),
					             runtime.list([9, 10]),
					             runtime.list([11, 12]),
					             runtime.list([13, 14]),
					             runtime.list([15, 16]),
					             runtime.list([17, 18]),
					             runtime.list([19, 20])]);
		    //   testPrim('first', id, [testList1], 1);
		    //   testPrim('first', id, [testList2], runtime.list([1, 2]));
               
		       
		       testPrim('second', id, [testList1], 2);
		      // testPrim('second', id, [testList2], runtime.list([3, 4]));
               /*
		       testPrim('third', id, [testList1], 3);
		       testPrim('third', id, [testList2], runtime.list([5, 6]));

		       testPrim('fourth', id, [testList1], 4);
		       testPrim('fourth', id, [testList2], runtime.list([7, 8]));
               
		       testPrim('fifth', id, [testList1], 5);
		       testPrim('fifth', id, [testList2], runtime.list([9, 10]));

		       testPrim('sixth', id, [testList1], 6);
		       testPrim('sixth', id, [testList2], runtime.list([11, 12]));

		       testPrim('seventh', id, [testList1], 7);
		       testPrim('seventh', id, [testList2], runtime.list([13, 14]));

		       testPrim('eighth', id, [testList1], 8);
		       testPrim('eighth', id, [testList2], runtime.list([15, 16]));
               */
	           });




        /*************************************
         *** Primitive List Function Tests ***
         *************************************/


        runRawTest('cons, car, and cdr',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('car'),
						         [makeApplication(makePrimval('cons'),
							 	          [makeConstant(runtime.rational(1)),
								           makeConstant(runtime.EMPTY)])]));
		       assert.deepEqual(run(state), runtime.rational(1));

		       state.pushControl(makeApplication(makePrimval('cdr'),
						         [makeApplication(makePrimval('cons'),
							  	          [makeConstant(runtime.rational(1)),
								           makeConstant(runtime.EMPTY)])]));
		       assert.deepEqual(run(state), runtime.EMPTY);

		       state.pushControl(makeApplication(makePrimval('cdr'),
						         [makeApplication(makePrimval('cons'),
							                  [makeConstant(runtime.rational(1)),
							                   makeApplication(makePrimval('cons'),
								                           [makeConstant(runtime.rational(2)),
								                            makeConstant(runtime.EMPTY)])])]));
		       assert.deepEqual(run(state), runtime.pair(2, runtime.EMPTY));
	           });


        runRawTest('list?',
	           function() {
		       testPrim('list?', id, [runtime.EMPTY], true);
		       testPrim('list?', id, [runtime.pair(1, runtime.EMPTY)], true);
		       testPrim('list?', id, [runtime.list([1, 2, 0, 3, 2])], true);
		       testPrim('list?', id, [runtime.pair(1, 4)], false);
		       testPrim('list?', id, [runtime.complex(0, 2)], false);
	           });


        runRawTest('list',
	           function() {
		       testPrim('list', runtime.rational, [], runtime.EMPTY);
		       testPrim('list', runtime.rational, [1], runtime.pair(runtime.rational(1), runtime.EMPTY));
		       testPrim('list', runtime.rational, [1, 5, 3], runtime.list([runtime.rational(1),
									           runtime.rational(5),
									           runtime.rational(3)]));
	           });


        runRawTest('list*',
	           function() {
		       testPrim('list*', id, [runtime.EMPTY], runtime.EMPTY);
		       testPrim('list*', id, [runtime.rational(1), runtime.pair(runtime.rational(2), runtime.EMPTY)],
			        runtime.list([runtime.rational(1), runtime.rational(2)]));
		       testPrim('list*', id, [1, 2, 3, runtime.list([4, 5])], runtime.list([1, 2, 3, 4, 5]));
	           });


        runRawTest('length',
	           function() {
		       testPrim('length', id, [runtime.EMPTY], 0);
		       testPrim('length', runtime.list, [[1]], 1);
		       testPrim('length', runtime.list, [[1, 2, 3, 4]], 4);
	           });


        runRawTest('append',
	           function() {
		       testPrim('append', runtime.list, [], runtime.EMPTY);
		       testPrim('append', runtime.list, [[1]], runtime.list([1]));
		       testPrim('append', runtime.list, [[], [1, 2, 3], [1, 2]],
			        runtime.list([1, 2, 3, 1, 2]));
		       testPrim('append', id, [runtime.list([1, 2]), runtime.list([3]), 4],
			        runtime.pair(1, runtime.pair(2, runtime.pair(3, 4))));
		       testPrim('append', id, [5], 5);
		       testPrim('append', id, [runtime.EMPTY, 3], 3);
	           });


        runRawTest('reverse',
	           function() {
		       testPrim('reverse', id, [runtime.EMPTY], runtime.EMPTY);
		       testPrim('reverse', id, [runtime.list([1])], runtime.list([1]));
		       testPrim('reverse', id, [runtime.list([1, 2, 3, 4, 5])], runtime.list([5, 4, 3, 2, 1]));
	           });


        runRawTest('list-ref',
	           function() {
		       var testList = runtime.list([runtime.rational(1),
					            runtime.rational(1),
					            runtime.rational(2),
					            runtime.rational(3),
					            runtime.rational(5),
					            runtime.rational(8),
					            runtime.rational(11)]);
		       testPrim('list-ref', id, [testList, runtime.rational(0)], runtime.rational(1));
		       testPrim('list-ref', id, [testList, runtime.rational(5)], runtime.rational(8));
	           });


        runRawTest('memq',
	           function() {
		       testPrim('memq', id, [0, runtime.list([1, 2, 3])], false);
		       testPrim('memq', id, [2, runtime.list([1, 2, 3])], runtime.list([2, 3]));
		       testPrim('memq', id, [runtime.complex(2, 2),
				             runtime.list([runtime.complex(1, 1),
						           runtime.complex(2, 2),
						           runtime.complex(3, 3)])],
			        false);
		       testPrim('memq', id, [runtime.char('a'),
				             runtime.list([runtime.char('c'),
						           runtime.char('b'),
						           runtime.char('a')])],
			        false);
		       testPrim('memq', id, [runtime.string('a'),
				             runtime.list([runtime.string('c'),
						           runtime.string('b'),
						           runtime.string('a')])],
			        false);

		       var str = runtime.string('hi');
		       testPrim('memq', id, [str, runtime.list([runtime.string('Yo'),
						                runtime.string(', '),
						                str])],
			        runtime.list([str]));
	           });


        runRawTest('memv',
	           function() {
		       testPrim('memv', id, [0, runtime.list([1, 2, 3])], false);
		       testPrim('memv', id, [2, runtime.list([1, 2, 3])], runtime.list([2, 3]));
		       testPrim('memv', id, [runtime.complex(2, 2),
				             runtime.list([runtime.complex(1, 1),
						           runtime.complex(2, 2),
						           runtime.complex(3, 3)])],
			        runtime.list([runtime.complex(2, 2), runtime.complex(3, 3)]));
		       testPrim('memv', id, [runtime.char('a'),
				             runtime.list([runtime.char('c'),
						           runtime.char('b'),
						           runtime.char('a')])],
			        runtime.list([runtime.char('a')]));
		       testPrim('memv', id, [runtime.string('a'),
				             runtime.list([runtime.string('c'),
						           runtime.string('b'),
						           runtime.string('a')])],
			        false);

		       var str = runtime.string('hi');
		       testPrim('memv', id, [str, runtime.list([runtime.string('Yo'),
						                runtime.string(', '),
						                str])],
			        runtime.list([str]));
	           });


        runRawTest('member',
	           function() {
		       testPrim('member', id, [0, runtime.list([1, 2, 3])], false);
		       testPrim('member', id, [2, runtime.list([1, 2, 3])], runtime.list([2, 3]));
		       testPrim('member', id, [runtime.complex(2, 2),
				               runtime.list([runtime.complex(1, 1),
						             runtime.complex(2, 2),
						             runtime.complex(3, 3)])],
			        runtime.list([runtime.complex(2, 2), runtime.complex(3, 3)]));
		       testPrimF('member', id, [runtime.char('b'),
					        runtime.list([runtime.char('c'),
						              runtime.char('b'),
						              runtime.char('a')])],
			         ['#\\b', '#\\a'], listToStringArray);
		       testPrimF('member', id, [runtime.string('a'),
					        runtime.list([runtime.string('c'),
						              runtime.string('b'),
						              runtime.string('a')])],
			         ['a'], listToStringArray);

		       var str = runtime.string('hi');
		       testPrim('member', id, [str, runtime.list([runtime.string('Yo'),
							          runtime.string(', '),
							          str])],
			        runtime.list([str]));
	           });


        runRawTest('remove',
	           function() {
		       testPrim('remove', id, [3, runtime.list([1, 2, 3, 4, 5])], runtime.list([1, 2, 4, 5]));
		       testPrim('remove', id, [1, runtime.list([1, 2, 1, 2])], runtime.list([2, 1, 2]));
		       testPrim('remove', id, [10, runtime.list([1, 2, 3, 4])], runtime.list([1,2,3,4]));
		       testPrimF('remove', id, [runtime.string('a'), runtime.list([runtime.string('b'),
									           runtime.string('a'),
									           runtime.string('c'),
									           runtime.string('a')])],
			         ['b', 'c', 'a'], listToStringArray);
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('remove'),
						         [makeConstant(runtime.string('a')),
						          makeConstant(runtime.list([runtime.string('b'),
									             runtime.string('a'),
									             runtime.string('c'),
									             runtime.string('a')]))]));
		       var res = run(state);
		       assert.deepEqual(res.first().toString(), 'b');
		       assert.deepEqual(res.rest().first().toString(), 'c');
		       assert.deepEqual(res.rest().rest().first().toString(), 'a');
		       assert.deepEqual(res.rest().rest().rest(), runtime.EMPTY);
	           });



        runRawTest('map',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('map'),
						         [makePrimval('add1'),
						          makeConstant(runtime.list([1, 2, 3]))]));
		       assert.deepEqual(run(state), runtime.list([2, 3, 4]));
	           });

        runRawTest('filter',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('filter'),
						         [makePrimval('even?'),
						          makeConstant(runtime.list([1, 2, 3, 4, 5, 6]))]));
		       assert.deepEqual(run(state), runtime.list([2, 4, 6]));

		       state.pushControl(makeApplication(makePrimval('filter'),
						         [makeLam(1, [], makeConstant(false)),
						          makeConstant(runtime.list([1, 2, 3, 4]))]));
		       assert.deepEqual(run(state), runtime.EMPTY);

		       state.pushControl(makeApplication(makePrimval('filter'),
						         [makeLam(1, [], makeConstant(true)),
						          makeConstant(runtime.list([1, 2, 3, 4]))]));
		       assert.deepEqual(run(state), runtime.list([1, 2, 3, 4]));
	           });


        runRawTest('foldl',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('foldl'),
						         [makePrimval('-'),
						          makeConstant(2),
						          makeConstant(runtime.list([1, 2, 3, 4]))]));
		       assert.deepEqual(run(state), 4);

		       state.pushControl(makeApplication(makePrimval('foldl'),
						         [makePrimval('cons'),
						          makeConstant(runtime.list([1, 2])),
						          makeConstant(runtime.list([3, 4, 5, 6]))]));
		       assert.deepEqual(run(state), runtime.list([6, 5, 4, 3, 1, 2]));
	           });


        runRawTest('foldr',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('foldr'),
						         [makePrimval('-'),
						          makeConstant(2),
						          makeConstant(runtime.list([1, 2, 3, 4]))]));
		       assert.deepEqual(run(state), 0);

		       state.pushControl(makeApplication(makePrimval('foldr'),
						         [makePrimval('cons'),
						          makeConstant(runtime.list([1, 2])),
						          makeConstant(runtime.list([3, 4, 5, 6]))]));
		       assert.deepEqual(run(state), runtime.list([3, 4, 5, 6, 1, 2]));
	           });



        runRawTest('build-list',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('build-list'),
						         [makeConstant(5), makePrimval('add1')]));
		       assert.deepEqual(run(state), runtime.list([1, 2, 3, 4, 5]));

		       state.pushControl(makeApplication(makePrimval('build-list'),
						         [makeConstant(5), makePrimval('number->string')]));
		       assert.deepEqual(run(state), runtime.list([runtime.string('0'),
							          runtime.string('1'),
							          runtime.string('2'),
							          runtime.string('3'),
							          runtime.string('4')]));
	           });


        runRawTest('argmax',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('argmax'),
						         [makePrimval('car'),
						          makeConstant(runtime.list([runtime.pair(1, 2),
									             runtime.list([1, 2, 3]),
									             runtime.pair(3, 5),
									             runtime.pair(2, 13)]))]));
		       assert.deepEqual(run(state), runtime.pair(3, 5));

		       state.pushControl(makeApplication(makePrimval('argmax'),
						         [makePrimval('-'),
						          makeConstant(runtime.list([1, 3, 5, 2, 4]))]));
		       assert.deepEqual(run(state), 1);
	           });


        runRawTest('argmin',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('argmin'),
						         [makePrimval('car'),
						          makeConstant(runtime.list([runtime.pair(1, 2),
									             runtime.list([1, 2, 3]),
									             runtime.pair(3, 5),
									             runtime.pair(2, 13)]))]));
		       assert.deepEqual(run(state), runtime.pair(1, 2));

		       state.pushControl(makeApplication(makePrimval('argmin'),
						         [makePrimval('-'),
						          makeConstant(runtime.list([1, 3, 5, 2, 4]))]));
		       assert.deepEqual(run(state), 5);
	           });


        runRawTest('quicksort',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('quicksort'),
						         [makeConstant(runtime.list([4, 3, 6, 8, 2, 9])),
						          makePrimval('<')]));
		       var result = run(state);
		       assert.deepEqual(result, runtime.list([2, 3, 4, 6, 8, 9]));

		       state.pushControl(makeApplication(makePrimval('quicksort'),
						         [makeConstant(runtime.list([runtime.char('k'),
									             runtime.char('o'),
									             runtime.char('c'),
									             runtime.char('g')])),
						          makePrimval('char>?')]));
		       assert.deepEqual(run(state), runtime.list([runtime.char('o'),
							          runtime.char('k'),
							          runtime.char('g'),
							          runtime.char('c')]));
	           });


        runRawTest('compose',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makeApplication(makePrimval('compose'),
								         [makePrimval('magnitude'),
								          makePrimval('+'),
								          makePrimval('values')]),
						         [makeConstant(2),
						          makeConstant(3),
						          makeConstant(2),
						          makeConstant(runtime.complex(-4, 4))]));
		       assert.deepEqual(run(state), runtime.rational(5));

		       var composed = makeApplication(makePrimval('compose'),
					              [makePrimval('even?'),
						       makePrimval('*'),
						       makePrimval('values')]);
		       state.pushControl(makeApplication(composed, [makeConstant(3), makeConstant(5)]));
		       assert.deepEqual(run(state), false);
		       state.pushControl(makeApplication(composed, [makeConstant(2), makeConstant(4), makeConstant(15)]));
		       assert.deepEqual(run(state), true);
	           });


        runRawTest('caar, cadr, cdar, cddr, etc.',
	           function() {
		       var deepArrayToList = function(a) {
		           if ( !(a instanceof Array) ) {
			       return a;
		           }
		           return runtime.list( helpers.map(deepArrayToList, a) );
		       }

		       testPrim('car', runtime.list, [[1, 2, 3]], 1);
		       testPrim('caar', deepArrayToList, [[[1, 2], [3, 4], []]], 1);
		       testPrim('caar', deepArrayToList, [[[[1, 2], [3, 4]], [[5, 6], [7, 8]]]], runtime.list([1, 2]));
		       testPrim('caar', runtime.list, [[runtime.pair(1, runtime.pair(2, 3))]], 1);

		       testPrim('cadr', runtime.list, [[1, 2, 3]], 2);
		       testPrim('cadr', deepArrayToList, [[[1, 2], [3, 4]]], runtime.list([3, 4]));

		       testPrim('cdar', deepArrayToList, [[[1, 2], [3, 4], []]], runtime.list([2]));
		       testPrim('cdar', runtime.list, [[runtime.pair(1, 2)]], 2);

		       testPrim('cddr', runtime.list, [[1, 2, 3, 4]], runtime.list([3, 4]));
		       testPrim('cddr', deepArrayToList, [[[], [1], [1, 2], [1, 2, 3]]], deepArrayToList([[1, 2], [1, 2, 3]]));
		       testPrim('cddr', id, [runtime.pair(1, runtime.pair(2, 3))], 3);

		       testPrim('caaar', deepArrayToList, [[[[1, 2], [3, 4]], [[5, 6], [7, 8]]]], 1);
		       testPrim('caaar', deepArrayToList, [[[runtime.pair(0, 1)]]], 0);

		       testPrim('caadr', deepArrayToList, [[[1, 2], [3, 4], []]], 3);
		       testPrim('caadr', deepArrayToList, [[[[1, 2], [3, 4]], [[5, 6], [7, 8]]]], runtime.list([5, 6]));

		       testPrim('cadar', deepArrayToList, [[[1, 2], [3, 4], []]], 2);
		       testPrim('cadar', deepArrayToList, [[[[1, 2], [3, 4]], [[5, 6], [7, 8]]]], runtime.list([3, 4]));

		       testPrim('cdaar', deepArrayToList, [[[[1, 2], [3, 4]], [[5, 6], [7, 8]]]], runtime.list([2]));
		       testPrim('cdaar', deepArrayToList, [[[runtime.pair(0, 1)]]], 1);

		       testPrim('cdadr', deepArrayToList, [[[1, 2], [3, 4], []]], runtime.list([4]));
		       testPrim('cdadr', deepArrayToList, [[[[1, 2], [3, 4]], [[5, 6], [7, 8]]]], deepArrayToList([[7, 8]]));
		       testPrim('cdadr', deepArrayToList, [[runtime.pair(1, 2), runtime.pair(3, 4)]], 4);

		       testPrim('cddar', deepArrayToList, [[[1, 2], [3, 4], []]], runtime.EMPTY);
		       testPrim('cddar', deepArrayToList, [[runtime.pair(1, runtime.pair(2, 3))]], 3);

		       testPrim('caddr', runtime.list, [[1, 2, 3, 4]], 3);
		       testPrim('caddr', deepArrayToList, [[[1, 2], [3, 4], []]], runtime.EMPTY);

		       testPrim('cdddr', runtime.list, [[1, 2, 3, 4]], runtime.list([4]));
		       testPrim('cdddr', id, [runtime.pair(1, runtime.pair(2, runtime.pair(3, 4)))], 4);

		       testPrim('cadddr', runtime.list, [[1, 2, 3, 4]], 4);
		       testPrim('cadddr', deepArrayToList, [[[1, 2], [3, 4], [5, 6], [7, 8]]], runtime.list([7, 8]));
	           });




        /***************************
         *** Box Primitive Tests ***
         ***************************/


        runRawTest('box',
	           function() {
		       testPrim('box', id, [1], runtime.box(1));
		       testPrim('box', runtime.string, ['abc'], runtime.box(runtime.string('abc')));
	           });


        runRawTest('box?',
	           function() {
		       testPrim('box?', runtime.box, [1], true);
		       testPrim('box?', runtime.char, ['a'], false);
		       testPrim('box?', id, [15], false);
	           });


        runRawTest('unbox',
	           function() {
		       testPrim('unbox', runtime.box, [2], 2);
		       testPrim('unbox', runtime.box, [runtime.char('a')], runtime.char('a'));
	           });


        runRawTest('set-box!',
	           function() {
		       var testBox1 = runtime.box(1);
		       var testBox2 = runtime.box(runtime.string('hello'));
		       testPrim('set-box!', id, [testBox1, 15], runtime.VOID);
		       testPrim('set-box!', id, [testBox2, runtime.string('world')], runtime.VOID);

		       assert.deepEqual(testBox1, runtime.box(15));
		       assert.deepEqual(testBox2, runtime.box(runtime.string('world')));
	           });




        /****************************
         *** Hash Primitive Tests ***
         ****************************/


        runRawTest('hash?',
	           function() {
		       testPrim('hash?', id, [1], false);
		       testPrim('hash?', runtime.vector, [[1, 2, 3]], false);
		       testPrim('hash?', runtime.hash, [runtime.EMPTY], true);
		       testPrim('hash?', runtime.hashEq, [runtime.EMPTY], true);
		       testPrim('hash?', runtime.hash, [runtime.list([runtime.pair(1, 2)])], true);
		       testPrim('hash?', runtime.hashEq, [runtime.list([runtime.pair(1, 2)])], true);
	           });


        runRawTest('str',
	           function() {
	               assert.equal(typeof(runtime.string('a')), 'object');
	           });


        runRawTest('make-hash',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('make-hash'), []));
		       var res = run(state);
		       assert.ok(types.isHash(res));
		       assert.ok(res.hash.isEmpty());


		       state.pushControl(makeApplication(makePrimval('make-hash'),
						         [makeConstant(runtime.list([runtime.pair(1, 2),
									             runtime.pair(3, 4),
									             runtime.pair(5, 6)]))]));
		       var res2 = run(state);
		       assert.ok(types.isHash(res2));
		       assert.ok( !res2.hash.isEmpty() );
		       assert.ok(res2.hash.containsKey(1));
		       assert.ok(res2.hash.containsKey(3));
		       assert.ok(res2.hash.containsKey(5));
		       assert.deepEqual(res2.hash.get(1), 2);
		       assert.deepEqual(res2.hash.get(3), 4);
		       assert.deepEqual(res2.hash.get(5), 6);

		       state.pushControl(makeApplication(makePrimval('make-hash'),
						         [makeConstant(runtime.list(
						             [runtime.pair(runtime.string('a'),
								           2)]))]));
		       var res3 = run(state);
		       assert.deepEqual(res3.hash.get(runtime.string('a')), 2);
	           });


        runRawTest('make-hasheq',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('make-hasheq'), []));
		       var res = run(state);
		       assert.ok(types.isHash(res));
		       assert.ok(res.hash.isEmpty());


		       state.pushControl(makeApplication(makePrimval('make-hasheq'),
						         [makeConstant(runtime.list([runtime.pair(1, 2),
									             runtime.pair(3, 4),
									             runtime.pair(5, 6)]))]));
		       var res2 = run(state);
		       assert.ok(types.isHash(res2));
		       assert.ok( !res2.hash.isEmpty() );
		       assert.ok(res2.hash.containsKey(1));
		       assert.ok(res2.hash.containsKey(3));
		       assert.ok(res2.hash.containsKey(5));
		       assert.deepEqual(res2.hash.get(1), 2);
		       assert.deepEqual(res2.hash.get(3), 4);
		       assert.deepEqual(res2.hash.get(5), 6);

		       var str1 = runtime.string('a');
		       var str2 = runtime.string('a');
		       state.pushControl(makeApplication(makePrimval('make-hasheq'),
						         [makeConstant(runtime.list(
						             [runtime.pair(str1, 1),
						              runtime.pair(str2, 2)]))]));
		       var res3 = run(state);
		       assert.ok( !res3.hash.containsKey(runtime.string('a')) );
		       assert.deepEqual(res3.hash.get(str1), 1);
		       assert.deepEqual(res3.hash.get(str2), 2);
	           });


        runRawTest('hash-set!',
	           function() {
		       var testHash = runtime.hash(runtime.list([runtime.pair(1, 1), runtime.pair(2, 3)]));
		       
                       //		sys.print('\ntestHash = ' + sys.inspect(testHash) + "\n");
                       //		sys.print('testHash.hash = ' + sys.inspect(testHash.hash) + '\n');

		       assert.deepEqual(testHash.hash.get(1), 1);
		       assert.deepEqual(testHash.hash.containsKey(5), false);

		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('hash-set!'),
						         [makeConstant(testHash), makeConstant(5), makeConstant(8)]));
		       var result = run(state);
		       assert.deepEqual(result, runtime.VOID);
		       assert.deepEqual(testHash.hash.get(5), 8);

		       state.pushControl(makeApplication(makePrimval('hash-set!'),
						         [makeConstant(testHash), makeConstant(1), makeConstant(0)]));
		       assert.deepEqual(run(state), runtime.VOID);
		       assert.deepEqual(testHash.hash.get(1), 0);
	           });


        runRawTest('hash-ref',
	           function() {
		       var hash1 = runtime.hash(runtime.list([runtime.pair(1, 2),
						              runtime.pair(runtime.string('hello'),
								           runtime.string('world')),
						              runtime.pair(runtime.string('hello'),
								           runtime.string('world2'))]));

		       testPrim('hash-ref', id, [hash1, runtime.string('hello')], runtime.string('world2'));
		       testPrim('hash-ref', id, [hash1, 1, false], 2);
		       testPrim('hash-ref', id, [hash1, 2, false], false);

		       var str1 = runtime.string('hello');
		       var str2 = str1.copy();
		       var hash2 = runtime.hashEq(runtime.list([runtime.pair(str1, runtime.string('world')),
							        runtime.pair(str2, runtime.string('world2')),
							        runtime.pair(1, 2),
							        runtime.pair(3, 4)]));
		       testPrim('hash-ref', id, [hash2, runtime.string('hello'), false], false);
		       testPrim('hash-ref', id, [hash2, str1], runtime.string('world'));
		       testPrim('hash-ref', id, [hash2, runtime.string('a'), 2], 2);

		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('hash-ref'),
						         [makeConstant(hash1),
						          makeConstant(2),
						          makeLam(0, [], makeConstant(15))]));
		       assert.deepEqual(run(state), 15);

		       state.pushControl(makeApplication(makePrimval('hash-ref'),
						         [makeConstant(hash2),
						          makeConstant(runtime.string('hello')),
						          makeLam(0, [], makeConstant(true))]));
		       assert.deepEqual(run(state), true);
	           });


        runRawTest('hash-remove!',
	           function() {
		       var hash1 = runtime.hash(runtime.list([runtime.pair(1, 2),
						              runtime.pair(2, 3),
						              runtime.pair(3, 4),
						              runtime.pair(4, 5)]));
		       assert.ok(hash1.hash.containsKey(1));
		       testPrim('hash-remove!', id, [hash1, 1], runtime.VOID);
		       assert.ok( !hash1.hash.containsKey(1) );

		       var str1 = runtime.string('a');
		       var str2 = runtime.string('b');
		       var hash2 = runtime.hashEq(runtime.list([runtime.pair(str1, 5),
							        runtime.pair(str2, 3)]));
		       testPrim('hash-remove!', id, [hash2, runtime.string('a')], runtime.VOID);
		       assert.ok(hash2.hash.containsKey(str1));
		       testPrim('hash-remove!', id, [hash2, str2], runtime.VOID);
		       assert.ok( !hash2.hash.containsKey(str2) );
	           });


        runRawTest('hash-map',
	           function() {
		       var str1 = runtime.string('hello');
		       var str2 = str1.copy();
		       var str3 = str1.copy();
		       var hash1 = runtime.hash(runtime.list([runtime.pair(str1, runtime.string('a')),
						              runtime.pair(str2, runtime.string('b')),
						              runtime.pair(str3, runtime.string('c'))]));

		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('hash-map'),
						         [makeConstant(hash1), makePrimval('string-append')]));
		       assert.ok( hash1.hash.containsKey(runtime.string('hello')) );
		       assert.deepEqual(run(state), runtime.list([runtime.string('helloc')]));

		       var hash2 = runtime.hashEq(runtime.list([runtime.pair(str1, runtime.string('a')),
							        runtime.pair(str2, runtime.string('b')),
							        runtime.pair(str3, runtime.string('c'))]));

		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('hash-map'),
						         [makeConstant(hash2), makePrimval('string-append')]));
		       assert.deepEqual(run(state), runtime.list([runtime.string('helloc'),
							          runtime.string('hellob'),
							          runtime.string('helloa')]));
	           });


        runRawTest('hash-for-each',
	           function() {
		       var hash1 = runtime.hash(runtime.list([runtime.pair(1, 2),
						              runtime.pair(2, 3),
						              runtime.pair(3, 4),
						              runtime.pair(4, 5)]));
		       var state = new runtime.State();
		       var ret = [];
		       state.pushControl(makeApplication(makePrimval('hash-for-each'),
						         [makeConstant(hash1),
						          makeConstant(new runtime.Primitive('', 2, false, false,
								                             function(state, key, val) {
								  	                         ret.push( helpers.format('~s - ~s!~n', [key, val]) );
								                             }))]));
		       assert.deepEqual(run(state), runtime.VOID);
		       assert.deepEqual(ret, ['1 - 2!\n', '2 - 3!\n', '3 - 4!\n', '4 - 5!\n']);
	           });





        /******************************
         *** Vector Primitive Tests ***
         ******************************/


        runRawTest('vector?',
	           function() {
		       testPrim('vector?', id, [1], false);
		       testPrim('vector?', runtime.list, [[1, 2, 3]], false);
		       testPrim('vector?', runtime.vector, [[1, 2, 3]], true);
	           });


        runRawTest('make-vector',
	           function() {
		       testPrim('make-vector', id, [0, runtime.char('a')], runtime.vector([]));
		       testPrim('make-vector', id, [3, 5], runtime.vector([5, 5, 5]));
	           });


        runRawTest('vector',
	           function() {
		       testPrim('vector', id, [1, 2, 3, 4], runtime.vector([1, 2, 3, 4]));
		       testPrim('vector', id, [], runtime.vector([]));
	           });


        runRawTest('vector-length',
	           function() {
		       testPrim('vector-length', runtime.vector, [[]], 0);
		       testPrim('vector-length', runtime.vector, [[1, 2, 3]], 3);
	           });


        runRawTest('vector-ref',
	           function() {
		       testPrim('vector-ref', id, [runtime.vector([1, 2]), 1], 2);
		       testPrim('vector-ref', id, [runtime.vector([3, 2, 1]), 0], 3);
	           });


        runRawTest('vector-set!',
	           function() {
		       testPrim('vector-set!', id, [runtime.vector([1, 2, 3]), 0, runtime.char('a')], types.VOID);

		       var testVec = runtime.vector([1, 2, 3, 4]);
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('vector-set!'),
						         [makeConstant(testVec),
						          makeConstant(2),
						          makeConstant(5)]));
		       var result = run(state);
		       assert.deepEqual(result, types.VOID);
		       assert.deepEqual(testVec, runtime.vector([1, 2, 5, 4]));

		       var testVec2 = runtime.vector([runtime.char('a'),
					              runtime.char('b'),
					              runtime.char('c')]);
		       state.pushControl(makeApplication(makePrimval('vector-set!'),
						         [makeConstant(testVec2),
						          makeConstant(1),
						          makeConstant(runtime.char('B'))]));
		       run(state);
		       assert.deepEqual(testVec2, runtime.vector([runtime.char('a'),
							          runtime.char('B'),
							          runtime.char('c')]));
	           });


        runRawTest('vector->list',
	           function() {
		       testPrim('vector->list', runtime.vector, [[]], runtime.EMPTY);
		       testPrim('vector->list', runtime.vector, [[1, 2, 3]], runtime.list([1, 2, 3]));
	           });



        /****************************
         *** Char Primitive Tests ***
         ****************************/




        runRawTest('char?',
	           function() {
		       testPrim('char?', id, [runtime.symbol('hello!')], false);
		       testPrim('char?', runtime.string, ['string'], false);
		       testPrim('char?', runtime.char, ['w'], true);
	           });


        runRawTest('char=?',
	           function() {
		       testPrim('char=?', runtime.char, ['a', 's', 'D'], false);
		       testPrim('char=?', runtime.char, ['f', 'F'], false);
		       testPrim('char=?', runtime.char, ['a', 'a', 'a'], true);
		       testPrim('char=?', runtime.char, ['1', '1', '2'], false);
	           });

        runRawTest('char-ci=?',
	           function() {
		       testPrim('char-ci=?', runtime.char, ['a', 's', 'D'], false);
		       testPrim('char-ci=?', runtime.char, ['f', 'F'], true);
		       testPrim('char-ci=?', runtime.char, ['a', 'a', 'a'], true);
		       testPrim('char-ci=?', runtime.char, ['1', '1', '2'], false);
	           });

        runRawTest('char<?',
	           function() {
		       testPrim('char<?', runtime.char, ['A', 'a'], true);
		       testPrim('char<?', runtime.char, ['a', 'b'], true);
		       testPrim('char<?', runtime.char, ['b', 'a'], false);
		       testPrim('char<?', runtime.char, ['a', 'd', 'c'], false);
		       testPrim('char<?', runtime.char, ['a', 'b', 'b', 'd'], false);
		       testPrim('char<?', runtime.char, ['a', 'b', 'c', 'd', 'e'], true);
	           });

        runRawTest('char>?',
	           function() {
		       testPrim('char>?', runtime.char, ['A', 'a'], false);
		       testPrim('char>?', runtime.char, ['a', 'b'], false);
		       testPrim('char>?', runtime.char, ['b', 'a'], true);
		       testPrim('char>?', runtime.char, ['f', 'd', 'e'], false);
		       testPrim('char>?', runtime.char, ['e', 'd', 'c', 'c', 'a'], false);
		       testPrim('char>?', runtime.char, ['e', 'd', 'c', 'b', 'a'], true);
	           });

        runRawTest('char<=?',
	           function() {
		       testPrim('char<=?', runtime.char, ['A', 'a'], true);
		       testPrim('char<=?', runtime.char, ['a', 'b'], true);
		       testPrim('char<=?', runtime.char, ['b', 'a'], false);
		       testPrim('char<=?', runtime.char, ['a', 'd', 'c'], false);
		       testPrim('char<=?', runtime.char, ['a', 'b', 'b', 'd'], true);
		       testPrim('char<=?', runtime.char, ['a', 'b', 'c', 'd', 'e'], true);
	           });

        runRawTest('char>=?',
	           function() {
		       testPrim('char>=?', runtime.char, ['A', 'a'], false);
		       testPrim('char>=?', runtime.char, ['a', 'b'], false);
		       testPrim('char>=?', runtime.char, ['b', 'a'], true);
		       testPrim('char>=?', runtime.char, ['f', 'd', 'e'], false);
		       testPrim('char>=?', runtime.char, ['e', 'd', 'c', 'c', 'a'], true);
		       testPrim('char>=?', runtime.char, ['e', 'd', 'c', 'b', 'a'], true);
	           });

        runRawTest('char-ci<?',
	           function() {
		       testPrim('char-ci<?', runtime.char, ['A', 'a'], false);
		       testPrim('char-ci<?', runtime.char, ['a', 'b'], true);
		       testPrim('char-ci<?', runtime.char, ['b', 'A'], false);
		       testPrim('char-ci<?', runtime.char, ['a', 'd', 'c'], false);
		       testPrim('char-ci<?', runtime.char, ['a', 'b', 'b', 'd'], false);
		       testPrim('char-ci<?', runtime.char, ['a', 'B', 'c', 'd', 'e'], true);
	           });

        runRawTest('char-ci>?',
	           function() {
		       testPrim('char-ci>?', runtime.char, ['a', 'A'], false);
		       testPrim('char-ci>?', runtime.char, ['a', 'b'], false);
		       testPrim('char-ci>?', runtime.char, ['b', 'A'], true);
		       testPrim('char-ci>?', runtime.char, ['f', 'd', 'e'], false);
		       testPrim('char-ci>?', runtime.char, ['e', 'd', 'c', 'c', 'a'], false);
		       testPrim('char-ci>?', runtime.char, ['e', 'd', 'C', 'b', 'a'], true);
	           });

        runRawTest('char-ci<=?',
	           function() {
		       testPrim('char-ci<=?', runtime.char, ['a', 'A'], true);
		       testPrim('char-ci<=?', runtime.char, ['a', 'B'], true);
		       testPrim('char-ci<=?', runtime.char, ['b', 'a'], false);
		       testPrim('char-ci<=?', runtime.char, ['a', 'd', 'c'], false);
		       testPrim('char-ci<=?', runtime.char, ['a', 'b', 'B', 'd'], true);
		       testPrim('char-ci<=?', runtime.char, ['a', 'b', 'C', 'd', 'e'], true);
	           });

        runRawTest('char-ci>=?',
	           function() {
		       testPrim('char-ci>=?', runtime.char, ['A', 'a'], true);
		       testPrim('char-ci>=?', runtime.char, ['a', 'b'], false);
		       testPrim('char-ci>=?', runtime.char, ['B', 'a'], true);
		       testPrim('char-ci>=?', runtime.char, ['f', 'd', 'e'], false);
		       testPrim('char-ci>=?', runtime.char, ['e', 'd', 'C', 'c', 'a'], true);
		       testPrim('char-ci>=?', runtime.char, ['e', 'd', 'c', 'B', 'a'], true);
	           });


        runRawTest('char-alphabetic?',
	           function() {
		       testPrim('char-alphabetic?', runtime.char, ['a'], true);
		       testPrim('char-alphabetic?', runtime.char, ['Z'], true);
		       testPrim('char-alphabetic?', runtime.char, ['3'], false);
		       testPrim('char-alphabetic?', runtime.char, [' '], false);
		       testPrim('char-alphabetic?', runtime.char, ['!'], false);
		       testPrim('char-alphabetic?', runtime.char, ['\n'], false);
	           });


        runRawTest('char-numeric?',
	           function() {
		       testPrim('char-numeric?', runtime.char, ['a'], false);
		       testPrim('char-numeric?', runtime.char, ['Z'], false);
		       testPrim('char-numeric?', runtime.char, ['3'], true);
		       testPrim('char-numeric?', runtime.char, [' '], false);
		       testPrim('char-numeric?', runtime.char, ['!'], false);
		       testPrim('char-numeric?', runtime.char, ['\n'], false);
	           });


        runRawTest('char-whitespace?',
	           function() {
		       testPrim('char-whitespace?', runtime.char, ['a'], false);
		       testPrim('char-whitespace?', runtime.char, ['Z'], false);
		       testPrim('char-whitespace?', runtime.char, ['3'], false);
		       testPrim('char-whitespace?', runtime.char, [' '], true);
		       testPrim('char-whitespace?', runtime.char, ['!'], false);
		       testPrim('char-whitespace?', runtime.char, ['\n'], true);
		       testPrim('char-whitespace?', runtime.char, ['\t'], true);
	           });


        runRawTest('char-upper-case?',
	           function() {
		       testPrim('char-upper-case?', runtime.char, ['a'], false);
		       testPrim('char-upper-case?', runtime.char, ['Z'], true);
		       testPrim('char-upper-case?', runtime.char, ['3'], false);
		       testPrim('char-upper-case?', runtime.char, [' '], false);
		       testPrim('char-upper-case?', runtime.char, ['!'], false);
		       testPrim('char-upper-case?', runtime.char, ['\n'], false);
	           });


        runRawTest('char-lower-case?',
	           function() {
		       testPrim('char-lower-case?', runtime.char, ['a'], true);
		       testPrim('char-lower-case?', runtime.char, ['Z'], false);
		       testPrim('char-lower-case?', runtime.char, ['3'], false);
		       testPrim('char-lower-case?', runtime.char, [' '], false);
		       testPrim('char-lower-case?', runtime.char, ['!'], false);
		       testPrim('char-lower-case?', runtime.char, ['\n'], false);
	           });


        runRawTest('char->integer',
	           function() {
		       testPrim('char->integer', runtime.char, ['0'], 48);
		       testPrim('char->integer', runtime.char, ['\n'], 10);
	           });


        runRawTest('integer->char',
	           function() {
		       testPrim('integer->char', id, [48], runtime.char('0'));
		       testPrim('integer->char', id, [65], runtime.char('A'));
	           });


        runRawTest('char-upcase',
	           function() {
		       testPrim('char-upcase', runtime.char, ['a'], runtime.char('A'));
		       testPrim('char-upcase', runtime.char, ['B'], runtime.char('B'));
		       testPrim('char-upcase', runtime.char, ['2'], runtime.char('2'));
		       testPrim('char-upcase', runtime.char, ['~'], runtime.char('~'));
	           });


        runRawTest('char-downcase',
	           function() {
		       testPrim('char-downcase', runtime.char, ['a'], runtime.char('a'));
		       testPrim('char-downcase', runtime.char, ['B'], runtime.char('b'));
		       testPrim('char-downcase', runtime.char, ['2'], runtime.char('2'));
		       testPrim('char-downcase', runtime.char, ['~'], runtime.char('~'));
	           });


        runRawTest('char print formatting',
	           function() {
		       testPrim('format', id, ['~s', runtime.char('\n')], runtime.string('#\\newline'));
		       testPrim('format', id, ['~s', runtime.char('\0')], runtime.string('#\\nul'));
		       testPrim('format', id, ['~a', runtime.char('b')], runtime.string('b'));
		       testPrim('format', id, ['~s', runtime.char('b')], runtime.string('#\\b'));

		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('format'),
						         [makeConstant('~s'),
						          makeApplication(makePrimval('integer->char'),
								          [makeConstant(24)])]));
		       assert.deepEqual(run(state), runtime.string('#\\u0018'));

		       state.pushControl(makeApplication(makePrimval('format'),
						         [makeConstant('~s'),
						          makeApplication(makePrimval('integer->char'),
								          [makeConstant(127)])]));
		       assert.deepEqual(run(state), runtime.string('#\\rubout'));

		       state.pushControl(makeApplication(makePrimval('format'),
						         [makeConstant('~s'),
						          makeApplication(makePrimval('integer->char'),
								          [makeConstant(955)])]));
		       assert.deepEqual(run(state), runtime.string('#\\u03BB'));
	           });


        ///////////////////////////////////////////////////////////////////////


        runRawTest('values',
	           function() {
		       testPrim('values', id, [], new runtime.ValuesWrapper([]));
		       testPrim('values', id, [1, 2, 3, 4], new runtime.ValuesWrapper([1, 2, 3, 4]));
		       testPrim('values', id, [1], 1);
	           });

        runRawTest('call-with-values',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('call-with-values'),
						         [makePrimval('values'),
						          makePrimval('+')]));
		       assert.deepEqual(run(state), 0);

		       state.pushControl(makeApplication(makePrimval('call-with-values'),
						         [makeLam(0, [], makeConstant(1)),
						          makePrimval('+')]));
		       assert.deepEqual(run(state), 1);

		       state.pushControl(makeApplication(makePrimval('call-with-values'),
						         [makeLam(0, [], makeApplication(makePrimval('values'),
								  		         [makeConstant(1),
										          makeConstant(2),
										          makeConstant(3)])),
						          makePrimval('+')]));
		       assert.deepEqual(run(state), 6);
	           });


        runRawTest('not',
	           function() {
		       testPrim('not', id, [false], true);
		       testPrim('not', id, [0], false);
		       testPrim('not', id, [1], false);
		       testPrim('not', runtime.char, ['0'], false);
	           });


        runRawTest('boolean?',
	           function() {
		       testPrim('boolean?', id, [false], true);
		       testPrim('boolean?', id, [true], true);
		       testPrim('boolean?', runtime.string, ['false'], false);
		       testPrim('boolean?', id, [0], false);
		       testPrim('boolean?', id, [1], false);
	           });


        runRawTest('eq?',
	           function() {
		       var testStr = runtime.string('hello');
		       var testChar = runtime.char('H');
		       testPrim('eq?', id, [1, 1], true);
		       testPrim('eq?', id, [1, 2], false);
		       testPrim('eq?', id, [runtime.rational(1, 3), runtime.rational(1, 3)], false);
		       testPrim('eq?', runtime.symbol, ['a', 'a'], true);
		       testPrim('eq?', runtime.string, ['a', 'a'], false);
		       testPrim('eq?', id, [testStr, testStr], true);
		       testPrim('eq?', id, [testChar, testChar], true);
		       testPrim('eq?', id, [testChar, runtime.char('H')], false);
	           });


        runRawTest('eqv?',
	           function() {
		       var testStr = runtime.string('hello');
		       var testChar = runtime.char('H');
		       testPrim('eqv?', id, [1, 1], true);
		       testPrim('eqv?', id, [1, 2], false);
		       testPrim('eqv?', id, [runtime.rational(1, 3), runtime.rational(1, 3)], true);
		       testPrim('eqv?', runtime.symbol, ['a', 'a'], true);
		       testPrim('eqv?', runtime.string, ['a', 'a'], false);
		       testPrim('eqv?', id, [testStr, testStr], true);
		       testPrim('eqv?', id, [testChar, testChar], true);
		       testPrim('eqv?', id, [testChar, runtime.char('H')], true);
	           });


        runRawTest('equal?',
	           function() {
		       var testStr = runtime.string('hello');
		       var testChar = runtime.char('H');
		       testPrim('equal?', id, [1, 1], true);
		       testPrim('equal?', id, [1, 2], false);
		       testPrim('equal?', id, [runtime.rational(1, 3), runtime.rational(1, 3)], true);
		       testPrim('equal?', runtime.symbol, ['a', 'a'], true);
		       testPrim('equal?', runtime.string, ['a', 'a'], true);
		       testPrim('equal?', id, [testStr, testStr], true);
		       testPrim('equal?', id, [testChar, testChar], true);
		       testPrim('equal?', id, [testChar, runtime.char('H')], true);
	           });


        runRawTest('equal~?',
	           function() {
		       testPrim('equal~?', id, [runtime.string('h'), runtime.string('h'), 5], true);
		       testPrim('equal~?', id, [5, 4, 0], false);
		       testPrim('equal~?', id, [runtime.char('a'), runtime.char('b'), 3], false);
		       testPrim('equal~?', id, [5, 3, 3], true);
		       testPrim('equal~?', runtime.float, [5.4, 4.9, 0.5], true);
	           });


        runRawTest('struct?',
	           function() {
		       testPrim('struct?', runtime.string, ['a'], false);
		       testPrim('struct?', id, [1], false);
		       testPrim('struct?', id, [runtime.EMPTY], false);
		       testPrim('struct?', runtime.box, [2], false);
		       testPrim('struct?', id, [runtime.posn(2, 4)], true);
	           });


        runRawTest('procedure-arity',
	           function() {
		       var state = new runtime.State();
		       state.pushControl(makeApplication(makePrimval('procedure-arity'), [makePrimval('+')]));
		       assert.deepEqual(run(state), runtime.arityAtLeast(0));

		       state.pushControl(makeApplication(makePrimval('procedure-arity'), [makePrimval('-')]));
		       assert.deepEqual(run(state), runtime.arityAtLeast(1));

		       state.pushControl(makeApplication(makePrimval('procedure-arity'), [makePrimval('equal?')]));
		       assert.deepEqual(run(state), 2);

		       state.pushControl(makeApplication(makePrimval('procedure-arity'), [makePrimval('random')]));
		       assert.deepEqual(run(state), runtime.list([0, 1]));

		       state.pushControl(makeApplication(makePrimval('procedure-arity'), [makePrimval('hash-ref')]));
		       assert.deepEqual(run(state), runtime.list([2, 3]));

		       var testProc = new types.CaseLambdaValue('',
			                                        [new runtime.Primitive('', 1, false, false, function() {}),
			                                         new runtime.Primitive('', 2, true, false, function() {})]);
		       state.pushControl(makeApplication(makePrimval('procedure-arity'), [makeConstant(testProc)]));
		       assert.deepEqual(run(state), runtime.list([1, runtime.arityAtLeast(2)]));

		       var testProc2 = new types.CaseLambdaValue('',
			                                         [new runtime.Primitive('', 1, false, false, function() {}),
			                                          new runtime.Primitive('', 0, true, false, function() {})]);
		       state.pushControl(makeApplication(makePrimval('procedure-arity'), [makeConstant(testProc2)]));
		       assert.deepEqual(run(state), runtime.arityAtLeast(0));

		       var testProc3 = new types.CaseLambdaValue('',
			                                         [new runtime.Primitive('', 1, false, false, function() {}),
			                                          new runtime.Primitive('', 4, true, false, function() {}),
			                                          new runtime.Primitive('', 0, false, false, function() {}),
			                                          new runtime.Primitive('', 3, true, false, function() {}),
			                                          new runtime.Primitive('', 3, false, false, function() {})]);
		       state.pushControl(makeApplication(makePrimval('procedure-arity'), [makeConstant(testProc3)]));
		       assert.deepEqual(run(state), runtime.list([0, 1, runtime.arityAtLeast(3)]));
	           });


        runRawTest('identity',
	           function() {
		       testPrim('identity', id, [5], 5);
		       testPrim('identity', runtime.string, ['hello'], runtime.string('hello'));
	           });


        runRawTest('make-posn',
	           function() {
		       testPrim('make-posn', id, [4, 5], runtime.posn(4, 5));
		       testPrim('make-posn', runtime.char, ['a', 'B'], runtime.posn(runtime.char('a'), runtime.char('B')));
	           });

        runRawTest('posn?',
	           function() {
		       testPrim('posn?', id, [4], false);
		       testPrim('posn?', runtime.box, [4], false);
		       testPrim('posn?', id, [runtime.posn(5, 4)], true);
	           });

        runRawTest('posn-x',
	           function() {
		       testPrim('posn-x', id, [runtime.posn(5, 4)], 5);
		       testPrim('posn-x', id, [runtime.posn(runtime.char('a'), runtime.char('b'))], runtime.char('a'));
	           });

        runRawTest('posn-y',
	           function() {	
		       testPrim('posn-y', id, [runtime.posn(5, 4)], 4);
		       testPrim('posn-y', id, [runtime.posn(runtime.char('a'), runtime.char('b'))], runtime.char('b'));
	           });


        runRawTest('structure equality',
	           function() {
		       var ParentType = types.makeStructureType('parent', false, 2, 0, false, false);
		       var makeParent = ParentType.constructor;
		       var ChildType = types.makeStructureType('child', ParentType, 0, 0, false, false);
		       var makeChild = ChildType.constructor;

		       testPrim('equal?', id, [makeParent('a', 5), makeParent('a', 5)], true);
		       testPrim('equal?', id, [makeParent('a', 5), makeParent('b', 5)], false);
		       testPrim('equal?', id, [makeParent('a', 5), makeChild('a', 5)], false);
		       testPrim('equal?', id, [makeChild('a', 5), makeParent('a', 5)], false);
		       testPrim('equal?', id, [makeParent('a', 5), runtime.color(4, 3, 6)], false);
	           });


        /***************************
         *** FFI Primitive Tests ***
         ***************************/


        /*
          runRawTest('get-js-object',
          function() {
          testPrim('get-js-object', id, ['setInterval'], types.jsObject('setInterval', setInterval));
          testPrim('get-js-object', id, [types.jsObject('types', types), 'box'],
          types.jsObject('types.box', types.box));
          testPrim('get-js-object', runtime.string, ['types', 'cons'], types.jsObject('types.cons', types.cons));
          testPrim('get-js-object', id, ['world', runtime.string('Kernel'), 'ellipseImage'],
          types.jsObject('world.Kernel.ellipseImage', world.Kernel.ellipseImage));
          testPrim('get-js-object', id, [types.jsObject('world', world), 'Kernel', 'isColor'],
          types.jsObject('world.Kernel.isColor', world.Kernel.isColor));
          testPrim('get-js-object', id, [types.jsObject('world.config', world.config), 'Kernel', 'getNoneEffect'],
          types.jsObject('world.config.Kernel.getNoneEffect', world.config.Kernel.getNoneEffect));
          testPrim('get-js-object', id, ['junk'], types.jsObject('junk', undefined));

          try {
          testPrim('get-js-object', id, ['world', 'junk', 'something'], false);
          } catch(e) {
          assert.deepEqual(e, types.schemeError(
          types.exnFailContract('get-js-object: tried to access field something of world.junk, '
          + 'but world.junk was undefined'),
          false));
          }
          });


          runRawTest('js-call',
          function() {
          testPrim('js-call', id, [types.jsObject('jsnums.greaterThan', jsnums.greaterThan), 4, runtime.rational(3, 2)], true);
          testPrim('js-call', id, [types.jsObject('types.hash', types.hash), runtime.EMPTY], types.hash(runtime.EMPTY));

          var state = new runtime.State();
          var results = [];
          state.pushControl(makeApplication(makePrimval('js-call'),
          [makeConstant(types.jsObject('setInterval', setInterval)),
          makeConstant(function() { results.push('tick'); }),
          makeConstant(500)]));
          var watchId = run(state);
          setTimeout(function() {
          clearInterval(watchId);
          assert.deepEqual(results, ['tick', 'tick', 'tick', 'tick', 'tick']);
          }, 2600);
          });
        */
        





        runRawTest("topsyntax",
	           function() {
	               sys.print("!Not implemented yet!  ");
	           });





        //////////////////////////////////////////////////////////////////////

        var queueErrorTest = function(name, code, expectedErrorText) {
            queueAsyncTest(name, function(success, fail) {
                var checkOutput = function(err) {
                    if ((evaluator.getMessageFromExn(err)+'') === expectedErrorText) {
                        success();
                    } else {
                        fail("not the same: " + 
                             types.toWrittenString(evaluator.getMessageFromExn(err)+'') + 
                             ", " +
                             types.toWrittenString(expectedErrorText));
                    }
                };
                var evaluator = new Evaluator(
                    { write: function(x) {  },
                      writeError: function(err) { },
                      compilationServletUrl: "/servlets/standalone.ss",
                      scriptCompilationServletUrl: "/servlets/standalone.ss"
                    });
                
                evaluator.setRootLibraryPath("/collects");
                evaluator.executeProgram(name, code, checkOutput,  checkOutput);
            });
        };


        var queueTest = function(name, code, expectedText) {
            queueAsyncTest(name, function(success, fail) {
                var checkOutput = function(err) {
                    if (outputSpan.text() === expectedText) {
                        success();
                    } else {
                        fail("not the same: " + 
                             types.toWrittenString(outputSpan.text()) + 
                             ", " +
                             types.toWrittenString(expectedText));
                    }
                };
                var outputSpan = jQuery("<span/>");
                var evaluator = new Evaluator(
                    { write: function(x) { outputSpan.append(x); },
                      writeError: function(err) { outputSpan.append(evaluator.getMessageFromExn(err)+''); },
                      compilationServletUrl: "/servlets/standalone.ss",
                      scriptCompilationServletUrl: "/servlets/standalone.ss"
                    });
                
                evaluator.setRootLibraryPath("/collects");
                evaluator.executeProgram(name, code, checkOutput,  checkOutput);
            });
        };



        queueTest("test simple function application program",
                  "(define (double x) (+ x x)) (double 25)",
                  "50");

        queueTest("test simple function application program 2",
                  "(define (double x) (+ x x)) (double (double 25))",
                  "100");

        queueTest("simple structures 1",
                  "(define-struct foo (x y)) (foo-x (make-foo 3 4))",
                  "3")

        queueTest("simple structures 2",
                  "(define-struct foo (x y)) (foo-y (make-foo 3 4))",
                  "4")

        queueTest("simple structures predicate 1",
                  "(define-struct foo (x y)) (foo? (make-foo 3 4))",
                  "true")

        queueTest("simple structures predicate 2",
                  "(define-struct foo (x y)) (foo? 'foo)",
                  "false")


        queueErrorTest("set! is not enabled, part 1",
                       "set!",
                       "set!: this variable is not defined")

        queueErrorTest("set! is not enabled, part 2",
                       "(define x 42) (set! x 16)",
                       "set!: this variable is not defined")


        queueErrorTest("test mis-application 1",
                       "(define (double x) (+ x x)) (double double)",
                       "+: expects a number as 1st argument, but given: #<procedure:double>; other arguments were: #<procedure:double>");

        queueErrorTest("test mis-application 2",
                       "(define (double x) (+ x x)) (double double 25)",
                       "double: expects 1 argument, but given 2: #<procedure:double> 25");




        

        queueErrorTest("test a error in map",
                       '(map add1 (list "1"))',
                       'add1: expects a number as 1st argument, but given: "1"');
                       

        queueErrorTest("test non-boolean in if test position",
                       "(if 3 'four 'five)",
                       'if: expected a boolean value, but found: 3');

        queueErrorTest("test non-boolean in 'or'",
                       "(or 42 4)",
                       'or: expected a boolean value, but found: 42');

        queueErrorTest("test non-boolean in 'or', second position",
                       "(or #f 4)",
                       'or: expected a boolean value, but found: 4');

        queueErrorTest("test non-boolean in 'and'",
                       "(and 'blah 4)",
                       "and: expected a boolean value, but found: blah");

        queueErrorTest("test non-boolean in 'and', second position",
                       "(and #t 'not-bool)",
                       "and: expected a boolean value, but found: not-bool");
    
	queueErrorTest("beside given 1 arg",
		       "(beside 5)",
		       "beside: expects at least 2 arguments, but given 1: 5");
	
	queueErrorTest("beside given 3 non-image args",
		       "(beside 2 3 3)",
		       "beside: expects an image as 1st argument, but given: 2; other arguments were: 3 3");
	
	queueErrorTest("beside given bad args, correct number",
		       "(beside 1 1)",
		       "beside: expects an image as 1st argument, but given: 1; other arguments were: 1");

	queueErrorTest("beside given 0 args",
		       "(beside)",
		       "beside: expects at least 2 arguments, but given 0");

	queueErrorTest("beside/align give too few args",
		       "(beside/align 3 3)",
		       "beside/align: expects at least 3 arguments, but given 2: 3 3");
	queueErrorTest("beside/align given bad args",
		       "(beside/align 3 3 3 3 3 3)",
		       "beside/align: expects a y-place as 1st argument, but given: 3; other arguments were: 3 3 3 3 3");

	queueErrorTest("beside/align given bad args, correct number",
		       "(beside/align 1 1 1)",
		       "beside/align: expects a y-place as 1st argument, but given: 1; other arguments were: 1 1");

	queueErrorTest("above given 0 args",
		       "(above)",
		       "above: expects at least 2 arguments, but given 0");
	
	queueErrorTest("above given bad args",
		      "(above 2 1 1)",
		      "above: expects an image as 1st argument, but given: 2; other arguments were: 1 1");
	
	queueErrorTest("above given bad args, correct number",
		       "(above 1 1)",
		       "above: expects an image as 1st argument, but given: 1; other arguments were: 1");

	queueErrorTest("above/align given no args",
		       "(above/align)",
		       "above/align: expects at least 3 arguments, but given 0");

	queueErrorTest("above/align given bad args, correct number",
		       "(above/align 1 1 1)",
		       "above/align: expects a x-place as 1st argument, but given: 1; other arguments were: 1 1");

	queueErrorTest("above/align given too many args, all bad",
		      "(above/align 1 1 1 1 1)",
		      "above/align: expects a x-place as 1st argument, but given: 1; other arguments were: 1 1 1 1"); 

	queueErrorTest("rotate given no args",
		       "(rotate)",
		       "rotate: expects 2 arguments, but given 0");
	
	queueErrorTest("rotate given correct number of bad args",
		       "(rotate 1 1)",
		       "rotate: expects an image as 2nd argument, but given: 1; other arguments were: 1");

	queueErrorTest("rotate given too many args",
		       "(rotate 1 1 1 1 1 1)",
		       "rotate: expects 2 arguments, but given 6: 1 1 1 1 1 1");

	queueErrorTest("crop given no args",
		       "(crop)",
		       "crop: expects 5 arguments, but given 0");
	
	queueErrorTest("crop given correct # args, but bad args",
		       "(crop 1 1 1 1 1)",
		       "crop: expects an image as 5th argument, but given: 1; other arguments were: 1 1 1 1");
	
	queueErrorTest("frame given no args",
		       "(frame)",
		       "frame: expects 1 argument, but given 0");

	queueErrorTest("frame given correct number args, but bad args",
		       "(frame 1)",
		       "frame: expects an image as 1st argument, but given: 1");

	queueErrorTest("frame given too many args",
		       "(frame 1 1)",
		       "frame: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("flip-vertical given no args",
		       "(flip-vertical)",
		       "flip-vertical: expects 1 argument, but given 0");

	queueErrorTest("flip-vertical given correct amount of args, but bad args",
		       "(flip-vertical 1)",
		       "flip-vertical: expects an image as 1st argument, but given: 1");

	queueErrorTest("flip-vertical given too many args",
		       "(flip-vertical 1 1)",
		       "flip-vertical: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("flip-horizontal given no args",
		       "(flip-horizontal)",
		       "flip-horizontal: expects 1 argument, but given 0");

	queueErrorTest("flip-horizontal given correct amount of args, but bad args",
		       "(flip-horizontal 1)",
		       "flip-horizontal: expects an image as 1st argument, but given: 1");

	queueErrorTest("flip-horizontal given too many args",
		       "(flip-horizontal 1 1)",
		       "flip-horizontal: expects 1 argument, but given 2: 1 1");

	queueErrorTest("text given no args",
		       "(text)",
		       "text: expects 3 arguments, but given 0");

	queueErrorTest("text given correct # args, but bad args",
		       "(text 1 1 1)",
		       "text: expects a string as 1st argument, but given: 1; other arguments were: 1 1");

	queueErrorTest("text given too many args",
		       "(text 1 1 1 1)",
		       "text: expects 3 arguments, but given 4: 1 1 1 1");

	queueErrorTest("text/font given bad number of args",
		       "(text/font 1)",
		       "text/font: expects 8 arguments, but given 1: 1");

	queueErrorTest("text/font given bad but correct amount of args",
		       "(text/font 1 1 1 1 1 1 1 1)",
		       "text/font: expects a string as 1st argument, but given: 1; other arguments were: 1 1 1 1 1 1 1");

	queueErrorTest("bitmap/url given bad amount of args",
		       "(bitmap/url)",
		       "image-url: expects 1 argument, but given 0");

	queueErrorTest("bitmap/url given correct amount of args, but bad as",
		       "(bitmap/url 1)",
		       "image-url: expects a string as 1st argument, but given: 1");

	queueErrorTest("video-url given bad amount of args",
		       "(video-url)",
		       "video-url: expects 1 argument, but given 0");
	
	queueErrorTest("video-url given correct arg amount, but bad as",
		       "(video-url 1)",
		       "video-url: expects a string as 1st argument, but given: 1");

	queueErrorTest("image-width given no args",
		       "(image-width)",
		       "image-width: expects 1 argument, but given 0");

	queueErrorTest("image-width given correct arg amount, but bad as",
		       "(image-width 1)",
		       "image-width: expects an image as 1st argument, but given: 1");

	queueErrorTest("image-height given no args",
		       "(image-height)",
		       "image-height: expects 1 argument, but given 0");

	queueErrorTest("image-height given correct arg amount, but bad as",
		       "(image-height 1)",
		       "image-height: expects an image as 1st argument, but given: 1");

	queueErrorTest("image-baseline given no args",
		       "(image-baseline)",
		       "image-baseline: expects 1 argument, but given 0");

	queueErrorTest("image-baseline given correct arg amount, but bad as",
		       "(image-baseline 1)",
		       "image-baseline: expects an image as 1st argument, but given: 1");
	
	queueErrorTest("color-list->image bad arg amount",
		       "(color-list->image)",
		       "color-list->image: expects 5 arguments, but given 0");

	queueErrorTest("color-list->bitmap bad arg a",
		       "(color-list->bitmap 1 1 1 1 1)",
		       "color-list->bitmap: expects 3 arguments, but given 5: 1 1 1 1 1");

	queueErrorTest("color-list->bitmap bad arg amount",
		       "(color-list->bitmap)",
		       "color-list->bitmap: expects 3 arguments, but given 0");

	queueErrorTest("color-list->image bad arg a",
		       "(color-list->image 1 1 1 1 1)",
		       "color-list->image: expects a list of image as 1st argument, but given: 1");
	
	queueErrorTest("mode? no args",
		       "(mode?)",
		       "mode?: expects 1 argument, but given 0");
	
	queueErrorTest("mode? too many args",
		       "(mode? 1 1)",
		       "mode?: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("image-color? no args",
		       "(image-color?)",
		       "image-color?: expects 1 argument, but given 0");
	
	queueErrorTest("image-color? too many args",
		       "(image-color? 1 1)",
		       "image-color?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("name->color no args",
		       "(name->color)",
		       "name->color: expects 1 argument, but given 0");
	
	queueErrorTest("name->color too many args",
		       "(name->color 1 1)",
		       "name->color: expects 1 argument, but given 2: 1 1");

	queueErrorTest("x-place? no args",
		       "(x-place?)",
		       "x-place?: expects 1 argument, but given 0");
	
	queueErrorTest("x-place? too many args",
		       "(x-place? 1 1)",
		       "x-place?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("y-place? no args",
		       "(y-place?)",
		       "y-place?: expects 1 argument, but given 0");
	
	queueErrorTest("y-place? too many args",
		       "(y-place? 1 1)",
		       "y-place?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("angle? no args",
		       "(angle?)",
		       "angle?: expects 1 argument, but given 0");

	queueErrorTest("angle? too many args",
		       "(angle? 1 1)",
		       "angle?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("side-count? no args",
		       "(side-count?)",
		       "side-count?: expects 1 argument, but given 0");

	queueErrorTest("side-count? too many args",
		       "(side-count? 1 1)",
		       "side-count?: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("step-count? no args",
		       "(step-count?)",
		       "step-count?: expects 1 argument, but given 0");

	queueErrorTest("step-count? too many args",
		       "(step-count? 1 1)",
		       "step-count?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("on-tick bad args amount",
		       "(on-tick)",
		       "on-tick: expects 1 or 2 arguments, but given 0");

	queueErrorTest("on-tick 1 arg",
		       "(on-tick 1)", 
		       "on-tick: expects a procedure as 1st argument, but given: 1");

	queueErrorTest("on-tick 2 args",
		       "(on-tick 1 2)",
		       "on-tick: expects a procedure as 1st argument, but given: 1; other arguments were: 2");
	
	queueErrorTest("on-tick! bad args amount",
		       "(on-tick!)",
		       "on-tick!: expects 2 or 3 arguments, but given 0");
	
	queueErrorTest("on-tick! given 2 bad args",
		       "(on-tick! 1 2)",
		       "on-tick!: expects a procedure as 1st argument, but given: 1; other arguments were: 2");
	
	queueErrorTest("on-tick! given 3 bad args",
		       "(on-tick! 1 2 3)",
		       "on-tick!: expects a procedure as 1st argument, but given: 1; other arguments were: 2 3");

	queueErrorTest("on-tap bad arg amount",
		       "(on-tap)",
		       "on-tap: expects 1 argument, but given 0");

	queueErrorTest("on-tap bad arg a",
		       "(on-tap 1)",
		       "on-tap: expects a procedure as 1st argument, but given: 1");

	queueErrorTest("on-tilt bad arg amount",
		       "(on-tilt)",
		       "on-tilt: expects 1 argument, but given 0");

	queueErrorTest("on-tilt bad arg a",
		       "(on-tilt 1)",
		       "on-tilt: expects a procedure as 1st argument, but given: 1");

	queueErrorTest("on-key bad arg amount",
		       "(on-key)",
		       "on-key: expects 1 argument, but given 0");
	
	queueErrorTest("on-key bad arg a",
		       "(on-key 1)",
		       "on-key: expects a procedure as 1st argument, but given: 1");

	queueErrorTest("on-key! bad arg amount",
		       "(on-key!)",
		       "on-key!: expects 2 arguments, but given 0");
	
	queueErrorTest("on-key! bad arg a",
		       "(on-key! 1 1)",
		       "on-key!: expects a procedure as 1st argument, but given: 1; other arguments were: 1");

	queueErrorTest("stop-when bad arg amount",
		       "(stop-when)",
		       "stop-when: expects 1 argument, but given 0");
	
	queueErrorTest("stop-when bad arg a",
		       "(stop-when 1)",
		       "stop-when: expects a procedure as 1st argument, but given: 1");
/*
	queueErrorTest("stop-when! bad arg amount",
		       "(stop-when!)",
		       "stop-when!: expects 2 arguments, but given 0");
	
	queueErrorTest("stop-when! bad arg a",
		       "(stop-when! 1 1)",
		       "stop-when!: expects a procedure as 1st argument, but given: 1; other arguments were: 1");
*/
	queueErrorTest("on-redraw bad arg amount",
		       "(on-redraw)",
		       "on-redraw: expects 1 argument, but given 0");

	queueErrorTest("on-redraw bad arg a",
		       "(on-redraw 1)",
		       "on-redraw: expects a procedure as 1st argument, but given: 1");



	queueErrorTest("on-draw bad arg amount",
		       "(on-draw)",
		       "on-draw: expects 1 or 2 arguments, but given 0");
	
	queueErrorTest("on-draw bad arg a",
		       "(on-draw 1)",
		       "on-draw: expects a procedure as 1st argument, but given: 1");

	queueErrorTest("on-draw bad arg as",
		       "(on-draw 1 2)",
		       "on-draw: expects a procedure as 1st argument, but given: 1; other arguments were: 2");

	queueErrorTest("initial-effect bad arg amount (no args)",
		       "(initial-effect)",
		       "initial-effect: expects 1 argument, but given 0");

	queueErrorTest("initial-effect too many args",
		       "(initial-effect 1 2)",
		       "initial-effect: expects 1 argument, but given 2: 1 2");

	queueErrorTest("big-bang given no arguments",
		       "(big-bang)",
		       "big-bang: expects at least 1 argument, but given 0");

	queueErrorTest("big-bang given wrong type of arg as 2nd arg",
		       "(big-bang 1 1)",
		       "big-bang: expects a handler or attribute list as 2nd argument, but given: 1; other arguments were: 1");

	queueErrorTest("make-struct-type wrong number of args",
		       "(make-struct-type)",
		       "make-struct-type: expects 4 or 5 or 6 or 7 or 8 or 9 or 10 arguments, but given 0");
	
	queueErrorTest("make-struct-type give wrong arg type",
		       "(make-struct-type 1 1 1 1)",
		       "make-struct-type: expects a symbol as 1st argument, but given: 1; other arguments were: 1 1 1");

	queueErrorTest("make-struct-field-accessor wrong number of args",
		       "(make-struct-field-accessor)",
		       "make-struct-field-accessor: expects 2 or 3 arguments, but given 0");
	
	queueErrorTest("make-struct-field-accessor given wrong arg type",
		       "(make-struct-field-accessor 1 1 1)",
		       "make-struct-field-accessor: expects an accessor procedure that requires a field index as 1st argument, but given: 1; other arguments were: 1 1");

	queueErrorTest("make-struct-field-accessor given 2 wrong args",
		       "(make-struct-field-accessor 1 1)", 
		       "make-struct-field-accessor: expects an accessor procedure that requires a field index as 1st argument, but given: 1; other arguments were: 1");

	queueErrorTest("make-struct-field-mutator given 2 args, bad a",
		       "(make-struct-field-mutator 1 1)",
		       "make-struct-field-mutator: expects a mutator procedure that requires a field index as 1st argument, but given: 1; other arguments were: 1");

	queueErrorTest("make-struct-field-mutator given no args",
		       "(make-struct-field-mutator)",
		       "make-struct-field-mutator: expects 2 or 3 arguments, but given 0");

	queueErrorTest("make-struct-field-mutator given 3 args, bad a",
		       "(make-struct-field-mutator 1 1 1)",
		       "make-struct-field-mutator: expects a mutator procedure that requires a field index as 1st argument, but given: 1; other arguments were: 1 1");

	queueErrorTest("procedure-arity given no args",
		       "(procedure-arity)",
		       "procedure-arity: expects 1 argument, but given 0");

	queueErrorTest("procedure-arity given bad arg a",
		       "(procedure-arity 1)",
		       "procedure-arity: expects a procedure as 1st argument, but given: 1");
	
	queueErrorTest("procedure-arity given way too many args",
		       "(procedure-arity 1 1 1 1 1 1 1 1 1 1)",
		       "procedure-arity: expects 1 argument, but given 10: 1 1 1 1 1 1 1 1 1 1");

	queueErrorTest("apply given no args",
		       "(apply)",
		       "apply: expects at least 2 arguments, but given 0");

	queueErrorTest("apply given bad arg as",
		       "(apply 1 1)",
		       "apply: expects a procedure as 1st argument, but given: 1; other arguments were: 1");
	
	queueErrorTest("apply given bad arg a for second arg",
		       "(apply add1 1)",
		       "apply: expects a list as 2nd argument, but given: 1; other arguments were: #<procedure:add1>");

	queueErrorTest("compose given bad arg a",
		       "(compose 1)",
		       "compose: expects a procedure as 1st argument, but given: 1");
	
	queueErrorTest("compose given bad 2nd arg a",
		       "(compose add1 1)",
		       "compose: expects a procedure as 2nd argument, but given: 1; other arguments were: #<procedure:add1>");
	
	queueErrorTest("current-inexact-milliseconds given too many args",
		       "(current-inexact-milliseconds 1)",
		       "current-inexact-milliseconds: expects 0 arguments, but given 1: 1");

	queueErrorTest("current-seconds given too many args",
		       "(current-seconds 1)",
		       "current-seconds: expects 0 arguments, but given 1: 1");	

	queueErrorTest("not given no args",
		       "(not)",
		       "not: expects 1 argument, but given 0");
	
	queueErrorTest("not given too many args",
		       "(not 1 1)",
		       "not: expects 1 argument, but given 2: 1 1");

	queueErrorTest("random given too many args",
		       "(random 1 1)",
		       "random: expects 0 or 1 arguments, but given 2: 1 1");
	
	queueErrorTest("random given bad arg a",
		       "(random add1)",
		       "random: expects a non-negative exact integer as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("sleep given bad arg a",
		       "(sleep add1)",
		       "sleep: expects a non-negative real number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("sleep given too many args",
		       "(sleep 1 2)",
		       "sleep: expects 0 or 1 arguments, but given 2: 1 2");
	
	queueErrorTest("identity given no args",
		       "(identity)",
		       "identity: expects 1 argument, but given 0");
	
	queueErrorTest("identity given too many args",
		       "(identity 2 2)",
		       "identity: expects 1 argument, but given 2: 2 2");
	
	queueErrorTest("raise given no args",
		       "(raise)",
		       "raise: expects 1 argument, but given 0");
	
	queueErrorTest("raise given too many args",
		       "(raise 1 1)",
		       "raise: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("error given no args",
		       "(error)",
		       "error: expects at least 1 argument, but given 0");
	
	queueErrorTest("error given bad a",
		       "(error 1)",
		       "error: expects a symbol or string as 1st argument, but given: 1");
	
	queueErrorTest("make-exn given no args",
		       "(make-exn)",
		       "make-exn: expects 2 arguments, but given 0");
	
	queueErrorTest("make-exn given bad arg as",
		       "(make-exn 1 1)",
		       "exn: expects argument of type continuation mark set, but given: 1");
	
	queueErrorTest("* given bad arg",
		       "(* add1)",
		       "*: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("/ given bad arg",
		       "(/ add1)",
		       "/: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("- given bad arg",
		       "(- add1)",
		       "-: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("+ given bad arg",
		       "(+ add1)",
		       "+: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("/ given no args",
		       "(/)",
		       "/: expects at least 1 argument, but given 0");

	queueErrorTest("- given no args",
		       "(-)",
		       "-: expects at least 1 argument, but given 0");
 
	queueErrorTest("= given no args",
		       "(=)",
		       "=: expects at least 2 arguments, but given 0");

	queueErrorTest("= given bad 2nd arg",
		       "(= 1 sub1)",
		       "=: expects a number as 2nd argument, but given: #<procedure:sub1>; other arguments were: 1");
	
	queueErrorTest("= given bad first arg",
		       "(= sub1 1)",
		       "=: expects a number as 1st argument, but given: #<procedure:sub1>; other arguments were: 1");
	
	queueErrorTest("=~ given no args",
		       "(=~)",
		       "=~: expects 3 arguments, but given 0");
	
	queueErrorTest("=~ given bad as",
		       "(=~ add1 sub1 add1)",
		       "=~: expects a real as 1st argument, but given: #<procedure:add1>; other arguments were: #<procedure:sub1> #<procedure:add1>");
	
	queueErrorTest("sub1 given no args",
		       "(sub1)",
		       "sub1: expects 1 argument, but given 0");
	
	queueErrorTest("sub1 given a bad arg",
		       "(sub1 add1)",
		       "sub1: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("sub1 given too many args",
		       "(sub1 1 1 1)",
		       "sub1: expects 1 argument, but given 3: 1 1 1");
	
	queueErrorTest("add1 given too many args",
		       "(add1 1 1 1)",
		       "add1: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("add1 given no args",
		       "(add1)",
		       "add1: expects 1 argument, but given 0");
	
	queueErrorTest("add1 given a bad arg",
		       "(add1 add1)",
		       "add1: expects a number as 1st argument, but given: #<procedure:add1>");
	

	queueErrorTest("< given no args",
		       "(<)",
		       "<: expects at least 2 arguments, but given 0");

	queueErrorTest("< given 1 bad arg",
		       "(< add1 1)",
		       "<: expects a number as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("< given 1 bad arg (2nd arg)",
		       "(< 1 add1)",
		       "<: expects a number as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("< given too few args",
		       "(< 1)",
		       "<: expects at least 2 arguments, but given 1: 1");

	queueErrorTest("> given no args",
		       "(>)",
		       ">: expects at least 2 arguments, but given 0");

	queueErrorTest("> given 1 bad arg",
		       "(> add1 1)",
		       ">: expects a number as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("> given 1 bad arg (2nd arg)",
		       "(> 1 add1)",
		       ">: expects a number as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("> given too few args",
		       "(> 1)",
		       ">: expects at least 2 arguments, but given 1: 1");


	queueErrorTest("<= given no args",
		       "(<=)",
		       "<=: expects at least 2 arguments, but given 0");
	
	queueErrorTest("<= given bad arg (first arg))",
		       "(<= add1 1)",
		       "<=: expects a number as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("<= given 1 bad arg (2nd arg)",
		       "(<= 1 add1)",
		       "<=: expects a number as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("<= given too few args",
		       "(<= 1)",
		       "<=: expects at least 2 arguments, but given 1: 1");

	queueErrorTest(">= given no args",
		       "(>=)",
		       ">=: expects at least 2 arguments, but given 0");
	
	queueErrorTest(">= given bad arg (first arg))",
		       "(>= add1 1)",
		       ">=: expects a number as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest(">= given 1 bad arg (2nd arg)",
		       "(>= 1 add1)",
		       ">=: expects a number as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest(">= given too few args",
		       "(>= 1)",
		       ">=: expects at least 2 arguments, but given 1: 1");
	
	queueErrorTest("abs given no args",
		       "(abs)",
		       "abs: expects 1 argument, but given 0");
	
	queueErrorTest("abs given 1 bad arg",
		       "(abs add1)",
		       "abs: expects a real as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("abs given too many args",
		       "(abs 1 1)",
		       "abs: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("quotient given no args",
		       "(quotient)",
		       "quotient: expects 2 arguments, but given 0");
	
	queueErrorTest("quotient given 1 bad arg (first arg))",
		       "(quotient add1 1)",
		       "quotient: expects an integer as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("quotient given 1 bad arg (2nd arg)",
		       "(quotient 1 add1)",
		       "quotient: expects an integer as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("quotient given too many args",
		       "(quotient 1 1 1)",
		       "quotient: expects 2 arguments, but given 3: 1 1 1");

	queueErrorTest("remainder given no args",
		       "(remainder)",
		       "remainder: expects 2 arguments, but given 0");
	
	queueErrorTest("remainder given 1 bad arg (first arg))",
		       "(remainder add1 1)",
		       "remainder: expects an integer as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("remainder given 1 bad arg (2nd arg)",
		       "(remainder 1 add1)",
		       "remainder: expects an integer as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("remainder given too many args",
		       "(remainder 1 1 1)",
		       "remainder: expects 2 arguments, but given 3: 1 1 1");

	queueErrorTest("modulo given no args",
		       "(modulo)",
		       "modulo: expects 2 arguments, but given 0");
	
	queueErrorTest("modulo given 1 bad arg (first arg))",
		       "(modulo add1 1)",
		       "modulo: expects an integer as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("modulo given 1 bad arg (2nd arg)",
		       "(modulo 1 add1)",
		       "modulo: expects an integer as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("modulo given too many args",
		       "(modulo 1 1 1)",
		       "modulo: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("max given no args",
		       "(max)",
		       "max: expects at least 1 argument, but given 0");
	
	queueErrorTest("max given 1 bad arg",
		       "(max add1)",
		       "max: expects a real as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("max given 1 good 1 bad arg",
		       "(max 1 add1)",
		       "max: expects a real as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("min given no args",
		       "(min)",
		       "min: expects at least 1 argument, but given 0");
	
	queueErrorTest("min given 1 bad arg",
		       "(min add1)",
		       "min: expects a real as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("min given 1 good 1 bad arg",
		       "(min 1 add1)",
		       "min: expects a real as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("gcd given no args",
		       "(gcd)",
		       "gcd: expects at least 1 argument, but given 0");
	
	queueErrorTest("gcd given 1 bad arg",
		       "(gcd add1)",
		       "gcd: expects an integer as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("gcd given 1 good 1 bad arg",
		       "(gcd 1 add1)",
		       "gcd: expects an integer as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");

	queueErrorTest("lcm given no args",
		       "(lcm)",
		       "lcm: expects at least 1 argument, but given 0");
	
	queueErrorTest("lcm given 1 bad arg",
		       "(lcm add1)",
		       "lcm: expects an integer as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("lcm given 1 good 1 bad arg",
		       "(lcm 1 add1)",
		       "lcm: expects an integer as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("floor given no args",
		       "(floor)",
		       "floor: expects 1 argument, but given 0");
	
	queueErrorTest("floor given 1 bad arg",
		       "(floor add1)",
		       "floor: expects a real as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("floor given too many args",
		       "(floor 1 1 1)",
		       "floor: expects 1 argument, but given 3: 1 1 1");
	
	queueErrorTest("ceiling given no args",
		       "(ceiling)",
		       "ceiling: expects 1 argument, but given 0");
	
	queueErrorTest("ceiling given 1 bad arg",
		       "(ceiling add1)",
		       "ceiling: expects a real as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("ceiling given too many args",
		       "(ceiling 1 1 1)",
		       "ceiling: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("round given no args",
		       "(round)",
		       "round: expects 1 argument, but given 0");
	
	queueErrorTest("round given 1 bad arg",
		       "(round add1)",
		       "round: expects a real as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("round given too many args",
		       "(round 1 1 1)",
		       "round: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("numerator given no args",
		       "(numerator)",
		       "numerator: expects 1 argument, but given 0");
	
	queueErrorTest("numerator given 1 bad arg",
		       "(numerator add1)",
		       "numerator: expects a rational number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("numerator given too many args",
		       "(numerator 1 1 1)",
		       "numerator: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("denominator given no args",
		       "(denominator)",
		       "denominator: expects 1 argument, but given 0");
	
	queueErrorTest("denominator given 1 bad arg",
		       "(denominator add1)",
		       "denominator: expects a rational number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("denominator given too many args",
		       "(denominator 1 1 1)",
		       "denominator: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("expt given no args",
		       "(expt)",
		       "expt: expects 2 arguments, but given 0");
	
	queueErrorTest("expt given bad first arg, valid 2nd arg",
		       "(expt add1 1)",
		       "expt: expects a number as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	queueErrorTest("expt given valid 1st arg, bad 2nd arg",
		       "(expt 1 add1)",
		       "expt: expects a number as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");

	queueErrorTest("expt given too many args",
		       "(expt 1 1 1)",
		       "expt: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("exp given no args",
		       "(exp)",
		       "exp: expects 1 argument, but given 0");
	
	queueErrorTest("exp given 1 bad arg",
		       "(exp add1)",
		       "exp: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("exp given too many bad args",
		       "(exp 1 1)",
		       "exp: expects 1 argument, but given 2: 1 1");

	queueErrorTest("log given no args",
		       "(log)",
		       "log: expects 1 argument, but given 0");

	queueErrorTest("log given 1 bad arg",
		       "(log add1)",
		       "log: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("log given too many args",
		       "(log 1 1)",
		       "log: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("sin given no args",
		       "(sin)",
		       "sin: expects 1 argument, but given 0");
	
	queueErrorTest("sin given 1 bad arg",
		       "(sin add1)",
		       "sin: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("sin given too many args",
		       "(sin 1 1)",
		       "sin: expects 1 argument, but given 2: 1 1");
//next trig func
	
		queueErrorTest("cos given no args",
		       "(cos)",
		       "cos: expects 1 argument, but given 0");
	
	queueErrorTest("cos given 1 bad arg",
		       "(cos add1)",
		       "cos: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cos given too many args",
		       "(cos 1 1)",
		       "cos: expects 1 argument, but given 2: 1 1");
//next trig func

	queueErrorTest("tan given no args",
		       "(tan)",
		       "tan: expects 1 argument, but given 0");
	
	queueErrorTest("tan given 1 bad arg",
		       "(tan add1)",
		       "tan: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("tan given too many args",
		       "(tan 1 1)",
		       "tan: expects 1 argument, but given 2: 1 1");
//next trig func

	queueErrorTest("asin given no args",
		       "(asin)",
		       "asin: expects 1 argument, but given 0");
	
	queueErrorTest("asin given 1 bad arg",
		       "(asin add1)",
		       "asin: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("asin given too many args",
		       "(asin 1 1)",
		       "asin: expects 1 argument, but given 2: 1 1");
//next trig func

	queueErrorTest("acos given no args",
		       "(acos)",
		       "acos: expects 1 argument, but given 0");
	
	queueErrorTest("acos given 1 bad arg",
		       "(acos add1)",
		       "acos: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("acos given too many args",
		       "(acos 1 1)",
		       "acos: expects 1 argument, but given 2: 1 1");
//next trig func

	queueErrorTest("atan given no args",
		       "(atan)",
		       "atan: expects 1 argument, but given 0");
	
	queueErrorTest("atan given 1 bad arg",
		       "(atan add1)",
		       "atan: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("atan given too many args",
		       "(atan 1 1)",
		       "atan: expects 1 argument, but given 2: 1 1");
//next trig func
		    
	
	queueErrorTest("sinh given no args",
		       "(sinh)",
		       "sinh: expects 1 argument, but given 0");
	
	queueErrorTest("sinh given 1 bad arg",
		       "(sinh add1)",
		       "sinh: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("sinh given too many args",
		       "(sinh 1 1)",
		       "sinh: expects 1 argument, but given 2: 1 1");
//next trig func
	
	queueErrorTest("cosh given no args",
		       "(cosh)",
		       "cosh: expects 1 argument, but given 0");
	
	queueErrorTest("cosh given 1 bad arg",
		       "(cosh add1)",
		       "cosh: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cosh given too many args",
		       "(cosh 1 1)",
		       "cosh: expects 1 argument, but given 2: 1 1");
  	    
	queueErrorTest("sqr given no args",
		       "(sqr)",
		       "sqr: expects 1 argument, but given 0");
	
	queueErrorTest("sqr given 1 bad arg",
		       "(sqr add1)",
		       "sqr: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("sqr given too many args",
		       "(sqr 1 1)",
		       "sqr: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("sqrt given no args",
		       "(sqrt)",
		       "sqrt: expects 1 argument, but given 0");

	queueErrorTest("sqrt given 1 bad arg",
		       "(sqrt add1)",
		       "sqrt: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("sqrt given too many args",
		       "(sqrt 1 1)",
		       "sqrt: expects 1 argument, but given 2: 1 1");

	queueErrorTest("integer-sqrt given no args",
		       "(integer-sqrt)",
		       "integer-sqrt: expects 1 argument, but given 0");

	queueErrorTest("integer-sqrt given 1 bad arg",
		       "(integer-sqrt add1)",
		       "integer-sqrt: expects an integer as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("integer-sqrt given too many args",
		       "(integer-sqrt 1 1)",
		       "integer-sqrt: expects 1 argument, but given 2: 1 1");

	queueErrorTest("make-rectangular given no args",
		       "(make-rectangular)",
		       "make-rectangular: expects 2 arguments, but given 0");
	
	queueErrorTest("make-rectangular given bad first arg, good 2nd",
		       "(make-rectangular add1 1)",
		       "make-rectangular: expects a real as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	
	queueErrorTest("make-rectangular given good first, bad second arg",
		       "(make-rectangular 1 add1)",
		       "make-rectangular: expects a real as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");

	queueErrorTest("make-rectangular given too many args",
		       "(make-rectangular 1 1 1 1 1)",
		       "make-rectangular: expects 2 arguments, but given 5: 1 1 1 1 1");
	
	queueErrorTest("make-polar given no args",
		       "(make-polar)",
		       "make-polar: expects 2 arguments, but given 0");
	
	queueErrorTest("make-polar given bad first arg, good 2nd",
		       "(make-polar add1 1)",
		       "make-polar: expects a real as 1st argument, but given: #<procedure:add1>; other arguments were: 1");
	
	
	queueErrorTest("make-polar given good first, bad second arg",
		       "(make-polar 1 add1)",
		       "make-polar: expects a real as 2nd argument, but given: #<procedure:add1>; other arguments were: 1");

	queueErrorTest("make-polar given too many args",
		       "(make-polar 1 1 1 1 1)",
		       "make-polar: expects 2 arguments, but given 5: 1 1 1 1 1");
	
	queueErrorTest("real-part given no args",
		       "(real-part)",
		       "real-part: expects 1 argument, but given 0");
	
	queueErrorTest("real-part given bad arg",
		       "(real-part add1)",
		       "real-part: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("real-part given too many args",
		       "(real-part 1 1)",
		       "real-part: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("imag-part given no args",
		       "(imag-part)",
		       "imag-part: expects 1 argument, but given 0");
	
	queueErrorTest("imag-part given bad arg",
		       "(imag-part add1)",
		       "imag-part: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("imag-part given too many args",
		       "(imag-part 1 1)",
		       "imag-part: expects 1 argument, but given 2: 1 1");

	queueErrorTest("angle given no args",
		       "(angle)",
		       "angle: expects 1 argument, but given 0");
	
	queueErrorTest("angle given bad arg",
		       "(angle add1)",
		       "angle: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("angle given too many args",
		       "(angle 1 1)",
		       "angle: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("magnitude given no args",
		       "(magnitude)",
		       "magnitude: expects 1 argument, but given 0");
	
	queueErrorTest("magnitude given bad arg",
		       "(magnitude add1)",
		       "magnitude: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("magnitude given too many args",
		       "(magnitude 1 1)",
		       "magnitude: expects 1 argument, but given 2: 1 1");	

	queueErrorTest("conjugate given no args",
		       "(conjugate)",
		       "conjugate: expects 1 argument, but given 0");
	
	queueErrorTest("conjugate given bad arg",
		       "(conjugate add1)",
		       "conjugate: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("conjugate given too many args",
		       "(conjugate 1 1)",
		       "conjugate: expects 1 argument, but given 2: 1 1");

	queueErrorTest("sgn given no args",
		       "(sgn)",
		       "sgn: expects 1 argument, but given 0");
	
	queueErrorTest("sgn given bad arg",
		       "(sgn add1)",
		       "sgn: expects a real number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("sgn given too many args",
		       "(sgn 1 1)",
		       "sgn: expects 1 argument, but given 2: 1 1");	

	queueErrorTest("inexact->exact given no args",
		       "(inexact->exact)",
		       "inexact->exact: expects 1 argument, but given 0");
	
	queueErrorTest("inexact->exact given bad arg",
		       "(inexact->exact add1)",
		       "inexact->exact: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("inexact->exact given too many args",
		       "(inexact->exact 1 1)",
		       "inexact->exact: expects 1 argument, but given 2: 1 1");

	queueErrorTest("exact->inexact given no args",
		       "(exact->inexact)",
		       "exact->inexact: expects 1 argument, but given 0");
	
	queueErrorTest("exact->inexact given bad arg",
		       "(exact->inexact add1)",
		       "exact->inexact: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("exact->inexact given too many args",
		       "(exact->inexact 1 1)",
		       "exact->inexact: expects 1 argument, but given 2: 1 1");

	queueErrorTest("number->string given no args",
		       "(number->string)",
		       "number->string: expects 1 argument, but given 0");
	
	queueErrorTest("number->string given bad arg",
		       "(number->string add1)",
		       "number->string: expects a number as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("number->string given too many args",
		       "(number->string 1 1)",
		       "number->string: expects 1 argument, but given 2: 1 1");

	queueErrorTest("string->number given no args",
		       "(string->number)",
		       "string->number: expects 1 argument, but given 0");
	
	queueErrorTest("string->number given bad arg",
		       "(string->number add1)",
		       "string->number: expects a string as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("string->number given too many args",
		       "(string->number 1 1)",
		       "string->number: expects 1 argument, but given 2: 1 1");


	queueErrorTest("xml->s-exp given no args",
		       "(xml->s-exp)",
		       "xml->s-exp: expects 1 argument, but given 0");
	
	queueErrorTest("xml->s-exp given bad arg",
		       "(xml->s-exp add1)",
		       "xml->s-exp: expects a string as 1st argument, but given: #<procedure:add1>");

	queueErrorTest("xml->s-exp given too many args",
		       "(xml->s-exp 1 1)",
		       "xml->s-exp: expects 1 argument, but given 2: 1 1");

	queueErrorTest("procedure? given no args",
		       "(procedure?)",
		       "procedure?: expects 1 argument, but given 0");
	
	queueErrorTest("procedure? too many args",
		       "(procedure? 1 1)",
		       "procedure?: expects 1 argument, but given 2: 1 1");

//next predicate

	queueErrorTest("pair? given no args",
		       "(pair?)",
		       "pair?: expects 1 argument, but given 0");
	
	queueErrorTest("pair? too many args",
		       "(pair? 1 1)",
		       "pair?: expects 1 argument, but given 2: 1 1");

//next predicate

	queueErrorTest("cons? given no args",
		       "(cons?)",
		       "cons?: expects 1 argument, but given 0");
	
	queueErrorTest("cons? too many args",
		       "(cons? 1 1)",
		       "cons?: expects 1 argument, but given 2: 1 1");

//next predicate

	queueErrorTest("empty? given no args",
		       "(empty?)",
		       "empty?: expects 1 argument, but given 0");
	
	queueErrorTest("empty? too many args",
		       "(empty? 1 1)",
		       "empty?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("null? given no args",
		       "(null?)",
		       "null?: expects 1 argument, but given 0");
	
	queueErrorTest("null? too many args",
		       "(null? 1 1)",
		       "null?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("undefined? given no args",
		       "(undefined?)",
		       "undefined?: expects 1 argument, but given 0");
	
	queueErrorTest("undefined? too many args",
		       "(undefined? 1 1)",
		       "undefined?: expects 1 argument, but given 2: 1 1");

//next predicate
/*
	queueErrorTest("void? given no args",
		       "(void?)",
		       "void?: expects 1 argument, but given 0");
	
	queueErrorTest("void? too many args",
		       "(void? 1 1)",
		       "void?: expects 1 argument, but given 2: 1 1");
*/
//next predicate
	queueErrorTest("symbol? given no args",
		       "(symbol?)",
		       "symbol?: expects 1 argument, but given 0");
	
	queueErrorTest("symbol? too many args",
		       "(symbol? 1 1)",
		       "symbol?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("string? given no args",
		       "(string?)",
		       "string?: expects 1 argument, but given 0");
	
	queueErrorTest("string? too many args",
		       "(string? 1 1)",
		       "string?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("char? given no args",
		       "(char?)",
		       "char?: expects 1 argument, but given 0");
	
	queueErrorTest("char? too many args",
		       "(char? 1 1)",
		       "char?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("boolean? given no args",
		       "(boolean?)",
		       "boolean?: expects 1 argument, but given 0");
	
	queueErrorTest("boolean? too many args",
		       "(boolean? 1 1)",
		       "boolean?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("vector? given no args",
		       "(vector?)",
		       "vector?: expects 1 argument, but given 0");
	
	queueErrorTest("vector? too many args",
		       "(vector? 1 1)",
		       "vector?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("struct? given no args",
		       "(struct?)",
		       "struct?: expects 1 argument, but given 0");
	
	queueErrorTest("struct? too many args",
		       "(struct? 1 1)",
		       "struct?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("eof-object? given no args",
		       "(eof-object?)",
		       "eof-object?: expects 1 argument, but given 0");
	
	queueErrorTest("eof-object? too many args",
		       "(eof-object? 1 1)",
		       "eof-object?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("posn? given no args",
		       "(posn?)",
		       "posn?: expects 1 argument, but given 0");
	
	queueErrorTest("posn? too many args",
		       "(posn? 1 1)",
		       "posn?: expects 1 argument, but given 2: 1 1");
/*
//next predicate
	queueErrorTest("bytes? given no args",
		       "(bytes?)",
		       "bytes?: expects 1 argument, but given 0");
	
	queueErrorTest("bytes? too many args",
		       "(bytes? 1 1)",
		       "bytes?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("byte? given no args",
		       "(byte?)",
		       "byte?: expects 1 argument, but given 0");
	
	queueErrorTest("byte? too many args",
		       "(byte? 1 1)",
		       "byte?: expects 1 argument, but given 2: 1 1");
*/
//next predicate
	queueErrorTest("number? given no args",
		       "(number?)",
		       "number?: expects 1 argument, but given 0");
	
	queueErrorTest("number? too many args",
		       "(number? 1 1)",
		       "number?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("complex? given no args",
		       "(complex?)",
		       "complex?: expects 1 argument, but given 0");
	
	queueErrorTest("complex? too many args",
		       "(complex? 1 1)",
		       "complex?: expects 1 argument, but given 2: 1 1");

//next predicate
	queueErrorTest("real? given no args",
		       "(real?)",
		       "real?: expects 1 argument, but given 0");
	
	queueErrorTest("rational? too many args",
		       "(rational? 1 1)",
		       "rational?: expects 1 argument, but given 2: 1 1");

//next predicate


	queueErrorTest("integer? given no args",
		       "(integer?)",
		       "integer?: expects 1 argument, but given 0");
	

	queueErrorTest("integer? too many args",
		       "(integer? 1 1)",
		       "integer?: expects 1 argument, but given 2: 1 1");


	queueErrorTest("exact? given no args",
		       "(exact?)",
		       "exact?: expects 1 argument, but given 0");
	
	queueErrorTest("exact? given a bad arg",
		       "(exact? add1)",
		       "exact?: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("exact? given too many args",
		       "(exact? 1 1)",
		       "exact?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("inexact? given no args",
		       "(inexact?)",
		       "inexact?: expects 1 argument, but given 0");
	
	queueErrorTest("inexact? given a bad arg",
		       "(inexact? add1)",
		       "inexact?: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("inexact? given too many args",
		       "(inexact? 1 1)",
		       "inexact?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("odd? given no args",
		       "(odd?)",
		       "odd?: expects 1 argument, but given 0");
	
	queueErrorTest("odd? given a bad arg",
		       "(odd? add1)",
		       "odd?: expects an integer as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("odd? given too many args",
		       "(odd? 1 1)",
		       "odd?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("even? given no args",
		       "(even?)",
		       "even?: expects 1 argument, but given 0");
	
	queueErrorTest("even? given a bad arg",
		       "(even? add1)",
		       "even?: expects an integer as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("even? given too many args",
		       "(even? 1 1)",
		       "even?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("zero? given no args",
		       "(zero?)",
		       "zero?: expects 1 argument, but given 0");
	
	queueErrorTest("zero? given a bad arg",
		       "(zero? add1)",
		       "zero?: expects a number as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("zero? given too many args",
		       "(zero? 1 1)",
		       "zero?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("positive? given no args",
		       "(positive?)",
		       "positive?: expects 1 argument, but given 0");
	
	queueErrorTest("positive? given a bad arg",
		       "(positive? add1)",
		       "positive?: expects a real as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("positive? given too many args",
		       "(positive? 1 1)",
		       "positive?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("negative? given no args",
		       "(negative?)",
		       "negative?: expects 1 argument, but given 0");
	
	queueErrorTest("negative? given a bad arg",
		       "(negative? add1)",
		       "negative?: expects a real as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("negative? given too many args",
		       "(negative? 1 1)",
		       "negative?: expects 1 argument, but given 2: 1 1");

	queueErrorTest("box? given no args",
		       "(box?)",
		       "box?: expects 1 argument, but given 0");
	
	queueErrorTest("box? given too many args",
		       "(box? 2 2)",
		       "box?: expects 1 argument, but given 2: 2 2");
	
	queueErrorTest("hash? given no args",
		       "(hash?)",
		       "hash?: expects 1 argument, but given 0");
	
	queueErrorTest("hash? given too many args",
		       "(hash? 2 2)",
		       "hash?: expects 1 argument, but given 2: 2 2");

	queueErrorTest("eq? given no args",
		       "(eq?)",
		       "eq?: expects 2 arguments, but given 0");
	
	queueErrorTest("eq? given too many args",
		       "(eq? 2 2 2)",
		       "eq?: expects 2 arguments, but given 3: 2 2 2");

	queueErrorTest("eq? given one arg",
		       "(eq? 1)",
		       "eq?: expects 2 arguments, but given 1: 1");

	queueErrorTest("eqv? given no args",
		       "(eqv?)",
		       "eqv?: expects 2 arguments, but given 0");
	
	queueErrorTest("eqv? given too many args",
		       "(eqv? 2 2 2)",
		       "eqv?: expects 2 arguments, but given 3: 2 2 2");

	queueErrorTest("eqv? given one arg",
		       "(eqv? 1)",
		       "eqv?: expects 2 arguments, but given 1: 1");

	queueErrorTest("equal? given no args",
		       "(equal?)",
		       "equal?: expects 2 arguments, but given 0");
	
	queueErrorTest("equal? given too many args",
		       "(equal? 2 2 2)",
		       "equal?: expects 2 arguments, but given 3: 2 2 2");

	queueErrorTest("equal? given one arg",
		       "(equal? 1)",
		       "equal?: expects 2 arguments, but given 1: 1");
	
	queueErrorTest("equal~? given no args",
		       "(equal~?)",
		       "equal~?: expects 3 arguments, but given 0");

	queueErrorTest("equal~? given too many args",
		       "(equal~? 1 1 1 1)",
		       "equal~?: expects 3 arguments, but given 4: 1 1 1 1");
	
	queueErrorTest("equal~? given bad arg a for 3rd arg",
		       "(equal~? add1 sub1 add1)",
		       "equal~?: expects a non-negative number as 3rd argument, but given: #<procedure:add1>; other arguments were: #<procedure:add1> #<procedure:sub1>");
	
	queueErrorTest("false? given no args",
		       "(false?)",
		       "false?: expects 1 argument, but given 0");
	
	queueErrorTest("false? given too many args",
		       "(false? 1 1)",
		       "false?: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("symbol=? given no args",
		       "(symbol=?)",
		       "symbol=?: expects 2 arguments, but given 0");
	
	queueErrorTest("symbol=? given too many args",
		       "(symbol=? 1 1 1)",
		       "symbol=?: expects 2 arguments, but given 3: 1 1 1");

	queueErrorTest("symbol=? given bad first arg",
		       "(symbol=? add1 sub1)",
		       "symbol=?: expects a symbol as 1st argument, but given: #<procedure:add1>; other arguments were: #<procedure:sub1>");

	queueErrorTest("symbol=? given bad 2nd arg",
		       "(symbol=? 'asdf sub1)",
		       "symbol=?: expects a symbol as 2nd argument, but given: #<procedure:sub1>; other arguments were: asdf");

	queueErrorTest("cons given no args",
		       "(cons)",
		       "cons: expects 2 arguments, but given 0");
	
	queueErrorTest("cons given too many args",
		       "(cons 1 1 1)",
		       "cons: expects 2 arguments, but given 3: 1 1 1");

	queueErrorTest("car given no args",
		       "(car)",
		       "car: expects 1 argument, but given 0");

	queueErrorTest("car given bad arg",
		       "(car add1)",
		       "car: expects a pair as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("car given too many args",
		       "(car 1 1 1)",
		       "car: expects 1 argument, but given 3: 1 1 1");
//next list primitive

	queueErrorTest("cdr given no args",
		       "(cdr)",
		       "cdr: expects 1 argument, but given 0");

	queueErrorTest("cdr given bad arg",
		       "(cdr add1)",
		       "cdr: expects a pair as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cdr given too many args",
		       "(cdr 1 1 1)",
		       "cdr: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("caar given no args",
		       "(caar)",
		       "caar: expects 1 argument, but given 0");

	queueErrorTest("caar given bad arg",
		       "(caar add1)",
		       "caar: expects a caarable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("caar given too many args",
		       "(caar 1 1 1)",
		       "caar: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("cadr given no args",
		       "(cadr)",
		       "cadr: expects 1 argument, but given 0");

	queueErrorTest("cadr given bad arg",
		       "(cadr add1)",
		       "cadr: expects a cadrable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cadr given too many args",
		       "(cadr 1 1 1)",
		       "cadr: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("cdar given no args",
		       "(cdar)",
		       "cdar: expects 1 argument, but given 0");

	queueErrorTest("cdar given bad arg",
		       "(cdar add1)",
		       "cdar: expects a cdarable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cdar given too many args",
		       "(cdar 1 1 1)",
		       "cdar: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("cddr given no args",
		       "(cddr)",
		       "cddr: expects 1 argument, but given 0");

	queueErrorTest("cddr given bad arg",
		       "(cddr add1)",
		       "cddr: expects a cddrable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cddr given too many args",
		       "(cddr 1 1 1)",
		       "cddr: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("caaar given no args",
		       "(caaar)",
		       "caaar: expects 1 argument, but given 0");

	queueErrorTest("caaar given bad arg",
		       "(caaar add1)",
		       "caaar: expects a caaarable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("caaar given too many args",
		       "(caaar 1 1 1)",
		       "caaar: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("caadr given no args",
		       "(caadr)",
		       "caadr: expects 1 argument, but given 0");

	queueErrorTest("caadr given bad arg",
		       "(caadr add1)",
		       "caadr: expects a caadrable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("caadr given too many args",
		       "(caadr 1 1 1)",
		       "caadr: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("cadar given no args",
		       "(cadar)",
		       "cadar: expects 1 argument, but given 0");

	queueErrorTest("cadar given bad arg",
		       "(cadar add1)",
		       "cadar: expects a cadarable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cadar given too many args",
		       "(cadar 1 1 1)",
		       "cadar: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("cdaar given no args",
		       "(cdaar)",
		       "cdaar: expects 1 argument, but given 0");

	queueErrorTest("cdaar given bad arg",
		       "(cdaar add1)",
		       "cdaar: expects a cdaarable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cdaar given too many args",
		       "(cdaar 1 1 1)",
		       "cdaar: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("cdadr given no args",
		       "(cdadr)",
		       "cdadr: expects 1 argument, but given 0");

	queueErrorTest("cdadr given bad arg",
		       "(cdadr add1)",
		       "cdadr: expects a cdadrable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cdadr given too many args",
		       "(cdadr 1 1 1)",
		       "cdadr: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("cddar given no args",
		       "(cddar)",
		       "cddar: expects 1 argument, but given 0");

	queueErrorTest("cddar given bad arg",
		       "(cddar add1)",
		       "cddar: expects a cddarable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cddar given too many args",
		       "(cddar 1 1 1)",
		       "cddar: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("caddr given no args",
		       "(caddr)",
		       "caddr: expects 1 argument, but given 0");

	queueErrorTest("caddr given bad arg",
		       "(caddr add1)",
		       "caddr: expects a caddrable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("caddr given too many args",
		       "(caddr 1 1 1)",
		       "caddr: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("cdddr given no args",
		       "(cdddr)",
		       "cdddr: expects 1 argument, but given 0");

	queueErrorTest("cdddr given bad arg",
		       "(cdddr add1)",
		       "cdddr: expects a cdddrable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cdddr given too many args",
		       "(cdddr 1 1 1)",
		       "cdddr: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("cadddr given no args",
		       "(cadddr)",
		       "cadddr: expects 1 argument, but given 0");

	queueErrorTest("cadddr given bad arg",
		       "(cadddr add1)",
		       "cadddr: expects a cadddrable value as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("cadddr given too many args",
		       "(cadddr 1 1 1)",
		       "cadddr: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("rest given no args",
		       "(rest)",
		       "rest: expects 1 argument, but given 0");

	queueErrorTest("rest given bad arg",
		       "(rest add1)",
		       "rest: expects a non-empty list as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("rest given too many args",
		       "(rest 1 1 1)",
		       "rest: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("first given no args",
		       "(first)",
		       "first: expects 1 argument, but given 0");

	queueErrorTest("first given bad arg",
		       "(first add1)",
		       "first: expects a non-empty list as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("first given too many args",
		       "(first 1 1 1)",
		       "first: expects 1 argument, but given 3: 1 1 1");
//next list primitive
	
	queueErrorTest("second given no args",
		       "(second)",
		       "second: expects 1 argument, but given 0");
	
	queueErrorTest("second given bad arg",
		       "(second add1)",
		       "second: expects a list with 2 or more elements as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("second given too many args",
		       "(second 1 1 1)",
		       "second: expects 1 argument, but given 3: 1 1 1");
	
	queueErrorTest("third given no args",
		       "(third)",
		       "third: expects 1 argument, but given 0");
	
	queueErrorTest("third given bad arg",
		       "(third add1)",
		       "third: expects a list with 3 or more elements as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("third given too many args",
		       "(third 1 1 1)",
		       "third: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("fourth given no args",
		       "(fourth)",
		       "fourth: expects 1 argument, but given 0");
	
	queueErrorTest("fourth given bad arg",
		       "(fourth add1)",
		       "fourth: expects a list with 4 or more elements as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("fourth given too many args",
		       "(fourth 1 1 1)",
		       "fourth: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("fifth given no args",
		       "(fifth)",
		       "fifth: expects 1 argument, but given 0");
	
	queueErrorTest("fifth given bad arg",
		       "(fifth add1)",
		       "fifth: expects a list with 5 or more elements as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("fifth given too many args",
		       "(fifth 1 1 1)",
		       "fifth: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("sixth given no args",
		       "(sixth)",
		       "sixth: expects 1 argument, but given 0");
	
	queueErrorTest("sixth given bad arg",
		       "(sixth add1)",
		       "sixth: expects a list with 6 or more elements as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("sixth given too many args",
		       "(sixth 1 1 1)",
		       "sixth: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("seventh given no args",
		       "(seventh)",
		       "seventh: expects 1 argument, but given 0");
	
	queueErrorTest("seventh given bad arg",
		       "(seventh add1)",
		       "seventh: expects a list with 7 or more elements as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("seventh given too many args",
		       "(seventh 1 1 1)",
		       "seventh: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("eighth given no args",
		       "(eighth)",
		       "eighth: expects 1 argument, but given 0");
	
	queueErrorTest("eighth given bad arg",
		       "(eighth add1)",
		       "eighth: expects a list with 8 or more elements as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("eighth given too many args",
		       "(eighth 1 1 1)",
		       "eighth: expects 1 argument, but given 3: 1 1 1");

	queueErrorTest("length given no args",
		       "(length)",
		       "length: expects 1 argument, but given 0");
	
	queueErrorTest("length given a bad arg",
		       "(length add1)",
		       "length: expects a list as 1st argument, but given: #<procedure:add1>");
	
	queueErrorTest("length given too many args",
		       "(length 1 1)",
		       "length: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("list? given no args",
		       "(list?)",
		       "list?: expects 1 argument, but given 0");
	
	queueErrorTest("list? given too many args",
		       "(list? 1 1 1)",
		       "list?: expects 1 argument, but given 3: 1 1 1");
	
	queueErrorTest("list* given no args",
		       "(list*)",
		       "list*: expects at least 1 argument, but given 0");
	
	queueErrorTest("list* given too many args",
		       "(list* 1 1 1)",
		       "list*: expects a list as 3rd argument, but given: 1; other arguments were: 1 1");
	
	queueErrorTest("list-ref given no args",
		       "(list-ref)",
		       "list-ref: expects 2 arguments, but given 0");
	
	queueErrorTest("list-ref given too many args",
		       "(list-ref 1 1 1)",
		       "list-ref: expects 2 arguments, but given 3: 1 1 1");

	queueErrorTest("list-ref given bad arg for first arg",
			"(list-ref add1 1)",
			"list-ref: expects a list as 1st argument, but given: #<procedure:add1>; other arguments were: 1");

	queueErrorTest("list-ref given bad arg for second arg",
		       "(list-ref (list) add1)",
		       "list-ref: expects a non-negative exact integer as 2nd argument, but given: #<procedure:add1>; other arguments were: empty");
	
	queueErrorTest("append given bad args",
		       "(append sub1 add1)",
		       "append: expects a list as 1st argument, but given: #<procedure:sub1>; other arguments were: #<procedure:add1>")

	queueErrorTest("reverse given no args",
		       "(reverse)",
		       "reverse: expects 1 argument, but given 0");
	
	queueErrorTest("reverse given too many args",
		       "(reverse 1 1)",
		       "reverse: expects 1 argument, but given 2: 1 1");
	
	queueErrorTest("reverse given bad arg",
		       "(reverse add1)",
		       "reverse: expects a list as 1st argument, but given: #<procedure:add1>");


	queueErrorTest("underlay given no args",
		       "(underlay)",
		       "underlay: expects at least 2 arguments, but given 0");
	
	queueErrorTest("underlay given bad first arg",
		       "(underlay 1 1 1)",
		       "underlay: expects an image as 1st argument, but given: 1; other arguments were: 1 1");

	queueErrorTest("underlay given not enough args",
		       "(underlay 1)",
		       "underlay: expects at least 2 arguments, but given 1: 1");
	
	queueErrorTest("underlay/xy given no args",
		       "(underlay/xy)",
		       "underlay/xy: expects 4 arguments, but given 0");
	
	queueErrorTest("underlay/xy given bad first arg",
		       "(underlay/xy 1 1 1 1)",
		       "underlay/xy: expects an image as 1st argument, but given: 1; other arguments were: 1 1 1");

	queueErrorTest("underlay/xy given too many args",
		       "(underlay/xy 1 1 1 1 1)",
		       "underlay/xy: expects 4 arguments, but given 5: 1 1 1 1 1");

	queueErrorTest("underlay/align given no args",
		       "(underlay/align)",
		       "underlay/align: expects at least 4 arguments, but given 0");
	
	queueErrorTest("underlay/align given bad first arg",
		       "(underlay/align 1 1 1 1 1)",
		       "underlay/align: expects a x-place as 1st argument, but given: 1; other arguments were: 1 1 1 1");

	queueErrorTest("scale given no args",
		       "(scale)",
		       "scale: expects 2 arguments, but given 0");

	queueErrorTest("scale given too many args",
		       "(scale 1 1 1)",
		       "scale: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("scale given bad second arg a",
		       "(scale 1 1)",
		       "scale: expects an image as 2nd argument, but given: 1; other arguments were: 1");
	

	queueErrorTest("scale given bad first arg a",
		       "(scale add1 1)",
		       "scale: expects a finite real number as 1st argument, but given: #<procedure:add1>; other arguments were: 1");

	queueErrorTest("scale/xy given no args",
		       "(scale/xy)",
		       "scale/xy: expects 3 arguments, but given 0");
	
	queueErrorTest("scale/xy given bad 3rd arg a",
		       "(scale/xy 1 1 1)",
		       "scale/xy: expects an image as 3rd argument, but given: 1; other arguments were: 1 1");
	
	queueErrorTest("scale/xy given too many args",
		       "(scale/xy 1 1 1 1)",
		       "scale/xy: expects 3 arguments, but given 4: 1 1 1 1");

	queueErrorTest("andmap given no args",
		       "(andmap)",
		       "andmap: expects at least 2 arguments, but given 0");
	
	queueErrorTest("andmap given bad first arg a",
		       "(andmap 1 1)",
		       "andmap: expects a procedure as 1st argument, but given: 1; other arguments were: 1");

	queueErrorTest("andmap given bad 2nd arg a",
		       "(andmap add1 sub1)",
		       "andmap: expects a list as 2nd argument, but given: #<procedure:sub1>; other arguments were: #<procedure:add1>");
	
	queueErrorTest("ormap given no args",
		       "(ormap)",
		       "ormap: expects at least 2 arguments, but given 0");
	
	queueErrorTest("ormap given bad first arg a",
		       "(ormap 1 1)",
		       "ormap: expects a procedure as 1st argument, but given: 1; other arguments were: 1");

	queueErrorTest("ormap given bad 2nd arg a",
		       "(ormap add1 sub1)",
		       "ormap: expects a list as 2nd argument, but given: #<procedure:sub1>; other arguments were: #<procedure:add1>");	


	queueErrorTest("memq given no args",
		       "(memq)",
		       "memq: expects 2 arguments, but given 0");
	
	queueErrorTest("memq given too many args",
		       "(memq 1 1 1)",
		       "memq: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("memq given bad second arg a",
		       "(memq 1 1)",
		       "memq: expects a list as 2nd argument, but given: 1; other arguments were: 1");

	queueErrorTest("memv given no args",
		       "(memv)",
		       "memv: expects 2 arguments, but given 0");
	
	queueErrorTest("memv given too many args",
		       "(memv 1 1 1)",
		       "memv: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("memv given bad second arg a",
		       "(memv 1 1)",
		       "memv: expects a list as 2nd argument, but given: 1; other arguments were: 1");	


	queueErrorTest("member given no args",
		       "(member)",
		       "member: expects 2 arguments, but given 0");
	
	queueErrorTest("member given too many args",
		       "(member 1 1 1)",
		       "member: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("member given bad second arg a",
		       "(member 1 1)",
		       "member: expects a list as 2nd argument, but given: 1; other arguments were: 1");


	queueErrorTest("member? given no args",
		       "(member?)",
		       "member?: expects 2 arguments, but given 0");
	
	queueErrorTest("member? given too many args",
		       "(member? 1 1 1)",
		       "member?: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("member? given bad second arg a",
		       "(member? 1 1)",
		       "member?: expects a list as 2nd argument, but given: 1; other arguments were: 1");


	queueErrorTest("memf given no args",
		       "(memf)",
		       "memf: expects 2 arguments, but given 0");
	
	queueErrorTest("memf given too many args",
		       "(memf 1 1 1)",
		       "memf: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("memf given bad first arg a",
		       "(memf 1 1)",
		       "memf: expects a procedure as 1st argument, but given: 1; other arguments were: 1");


	queueErrorTest("assq given no args",
		       "(assq)",
		       "assq: expects 2 arguments, but given 0");
	
	queueErrorTest("assq given too many args",
		       "(assq 1 1 1)",
		       "assq: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("assq given bad second arg a",
		       "(assq 1 1)",
		       "assq: expects a list of pair as 2nd argument, but given: 1; other arguments were: 1");	

	queueErrorTest("assv given no args",
		       "(assv)",
		       "assv: expects 2 arguments, but given 0");
	
	queueErrorTest("assv given too many args",
		       "(assv 1 1 1)",
		       "assv: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("assv given bad second arg a",
		       "(assv 1 1)",
		       "assv: expects a list of pair as 2nd argument, but given: 1; other arguments were: 1");


	queueErrorTest("assoc given no args",
		       "(assoc)",
		       "assoc: expects 2 arguments, but given 0");
	
	queueErrorTest("assoc given too many args",
		       "(assoc 1 1 1)",
		       "assoc: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("assoc given bad second arg a",
		       "(assoc 1 1)",
		       "assoc: expects a list of pair as 2nd argument, but given: 1; other arguments were: 1");

	queueErrorTest("remove given no args",
		       "(remove)",
		       "remove: expects 2 arguments, but given 0");
	
	queueErrorTest("remove given too many args",
		       "(remove 1 1 1)",
		       "remove: expects 2 arguments, but given 3: 1 1 1");
	
	queueErrorTest("remove given bad second arg",
		       "(remove 1 1)",
		       "remove: expects a list as 2nd argument, but given: 1; other arguments were: 1");


        queueErrorTest("test check-expect functions",
                       "(check-expect + -)",
                       'check-expect cannot compare functions');

        queueErrorTest("test check-expect arity",
                       "(check-expect 1 2 3)",
                       'check-expect: expects 2 arguments, but given 3: 1 2 3');

        queueErrorTest("test check-expect arity",
                       "(check-expect )",
                       'check-expect: expects 2 arguments, but given 0');

        queueErrorTest("test check-within nonneg real",
                       "(check-within 2 1 -3)",
                       'check-within requires a non-negative real number for range, but given -3.');

         queueErrorTest("test check-within functions",
                       "(check-within + - 2)",
                        'check-within cannot compare functions');

         queueErrorTest("test check-within arity",
                       "(check-within 3 3 3 3 3 3 3 3 3 3 3)",
                        'check-within: expects 3 arguments, but given 11: 3 3 3 3 3 3 3 3 3 3 3');
         /*
         queueErrorTest("test print arity",
                       '(print "hello" "world")',
                        'print: expects 1 argument, but given 2: "hello" "world"');
            */
         queueErrorTest("test write arity",
                        "(write 1 2 3 4 5)",
                        "write: expects 1 or 2 arguments, but given 5: 1 2 3 4 5");

         queueErrorTest("test write arity",
                        "(write )",
                        "write: expects 1 or 2 arguments, but given 0");

        queueErrorTest("test display arity",
                        "(display 1 2 3 4 5)",
                        "display: expects 1 or 2 arguments, but given 5: 1 2 3 4 5");

        queueErrorTest("test display arity",
                        "(display )",
                        "display: expects 1 or 2 arguments, but given 0");

        queueErrorTest("test for-each arity",
                        "(for-each )",
                        "for-each: expects at least 2 arguments, but given 0");

        queueErrorTest("test for-each arity 2",
                        "(for-each 1 2 3 4 5)",
                         "for-each: expects a procedure as 1st argument, but given: 1; other arguments were: 2 3 4 5");


        queueErrorTest("test for-each a",
                        "(for-each 1 2)",
                         "for-each: expects a procedure as 1st argument, but given: 1; other arguments were: 2");



        //////////////////////////////////////////////////////////////////////


//map
        queueErrorTest("test map with function that cannot be applied to elements in list",
                       "(map add1 (list \"hello\" \"world\"))",
                       'add1: expects a number as 1st argument, but given: "hello"');
//filter
        queueErrorTest("test filter without procedure as 1st argument",
                       "(filter 2 (list 2 3 4))",
                       'filter: expects a procedure (arity 1) as 1st argument, but given: 2; other arguments were: (list 2 3 4)');

//foldl
        queueErrorTest("test foldl with arguments of wrong a",
                       "(foldl + \"1\" (list 2 3))",
                       '+: expects a number as 2nd argument, but given: "1"; other arguments were: 2');

        queueErrorTest("test foldl with arguments of wrong a",
                       "(foldl 1 7 (list 2 3))",
                       'foldl: expects a procedure as 1st argument, but given: 1; other arguments were: 7 (list 2 3)');

//foldr
        queueErrorTest("test foldr with arguments of wrong a",
                       "(foldr 1 2 (list 3))",
                       'foldr: expects a procedure as 1st argument, but given: 1; other arguments were: 2 (list 3)');

        queueErrorTest("test foldr with arguments of wrong a",
                       "(foldr + \"hello\" (list 1 2 3))",
                       '+: expects a number as 2nd argument, but given: "hello"; other arguments were: 3');

//argmax
        queueErrorTest("test argmax with empty list",
                       "(argmax 2 '())",
                       'argmax: expects a procedure as 1st argument, but given: 2; other arguments were: empty');

        queueErrorTest("test argmax with first argument not a procedure",
                       "(argmax 2 (list 2))",
                       'argmax: expects a procedure as 1st argument, but given: 2; other arguments were: (list 2)');

        queueErrorTest("test argmax with second argument not a list",
                       "(argmax car 2)",
                       'argmax: expects a non-empty list as 2nd argument, but given: 2; other arguments were: #<procedure:car>');

//argmin
        queueErrorTest("test argmin with empty list",
                       "(argmin 2 '())",
                       'argmin: expects a procedure as 1st argument, but given: 2; other arguments were: empty');

        queueErrorTest("test argmin with first argument not a procedure",
                       "(argmin 2 (list 2))",
                       'argmin: expects a procedure as 1st argument, but given: 2; other arguments were: (list 2)');

        queueErrorTest("test argmin with second argument not a list",
                       "(argmin car 2)",
                       'argmin: expects a non-empty list as 2nd argument, but given: 2; other arguments were: #<procedure:car>');

//build-list
        queueErrorTest("test build-list with first argument not a number",
                       "(build-list \"number\" add1)",
                       "build-list: expects a non-negative exact integer as 1st argument, but given: \"number\"; other arguments were: #<procedure:add1>");

        queueErrorTest("test build-list with second argument not a proc",
                       "(build-list 2 6)",
                       'build-list: expects a procedure as 2nd argument, but given: 6; other arguments were: 2');

//make-hash 

        queueErrorTest("test make-hash with listof listof pairs not first argument",
                       "(make-hash 1)",
                       'make-hash: expects a list of list of pairs as 1st argument, but given: 1');

        queueErrorTest("test make-hash with 2 arguments instead of 0 or 1",
                       "(make-hash (list (list 1 \"hello\") (list 2 \"world\") (list 3 \"today\")) 2)",
                       'make-hash: expects 0 or 1 arguments, but given 2: (list (list 1 "hello") (list 2 "world") (list 3 "today")) 2');


//hash-set!

        queueErrorTest("test hash-set! with first argument not a hash",
                       "(hash-set! 5 2 \"bird\")",
                       'hash-set!: expects a hash as 1st argument, but given: 5; other arguments were: 2 "bird"');

        queueErrorTest("test hash-set! with wrong arity",
                       "(hash-set!)",
                       'hash-set!: expects 3 arguments, but given 0');

//hash-ref 
        queueErrorTest("test hash-ref with wrong arity",
                       "(hash-ref \"thing\")",
                       'hash-ref: expects 2 or 3 arguments, but given 1: thing');

        queueErrorTest("test hash-ref with 1st argument not a hash",
                       "(hash-ref \"imma hash\" 2)",
                       'hash-ref: expects a hash as 1st argument, but given: "imma hash"; other arguments were: 2');

//hash-remove!
        queueErrorTest("test hash-remove! with wrong arity",
                       "(hash-remove!)",
                       'hash-remove: expects 2 arguments, but given 0');

        queueErrorTest("test hash-remove! with wrong 1st argument not hash",
                       "(hash-remove! 2 2)",
                       'hash-remove!: expects a hash as 1st argument, but given: 2; other arguments were: 2');

//hash-map

        queueErrorTest("test hash-map with wrong arity",
                       "(hash-map)",
                       'hash-map: expects 2 arguments, but given 0');

        queueErrorTest("test hash-map with wrong first argument not hash",
                       "(hash-map 2 cons)",
                       'hash-map: expects a hash as 1st argument, but given: 2; other arguments were: #<procedure:cons>');

        queueErrorTest("test hash-map with wrong 2nd argument not proc",
                       "(hash-map (make-hash (list (list 1 100) (list 2 200) (list 3 300))) 2)",
                       'hash-map: expects a procedure as 2nd argument, but given: 2; other arguments were: #hash((1 . (list 100)) (2 . (list 200)) (3 . (list 300)))');

//hash-for-each

        queueErrorTest("test hash-for-each with wrong arity",
                       "(hash-for-each)",
                       'hash-for-each: expects 2 arguments, but given 0');

        queueErrorTest("test hash-for-each with wrong 1st argument not proc",
                       "(hash-for-each \"imma hash brown\" cons)",
                       'hash-for-each: expects a hash as 1st argument, but given: "imma hash brown"; other arguments were: #<procedure:cons>');

        queueErrorTest("test hash-for-each with wrong 2nd argument not proc",
                       "(hash-for-each (make-hash) \"add\")",
                       'hash-for-each: expects a procedure as 2nd argument, but given: "add"; other arguments were: #hash()');

//make-string

        queueErrorTest("test make-string with wrong arity",
                       "(make-string)",
                       'make-string: expects 2 arguments, but given 0');

        queueErrorTest("test make-string with 1st argument not exact integer",
                       "(make-string 2.5 2)",
                       'make-string: expects a non-negative exact integer as 1st argument, but given: 5/2; other arguments were: 2');

        queueErrorTest("test make-string with 2nd argument not char",
                       "(make-string 3 2)",
                       'make-string: expects a char as 2nd argument, but given: 2; other arguments were: 3');

//replicate

        queueErrorTest("test replicate with wrong arity",
                       "(replicate)",
                       'replicate: expects 2 arguments, but given 0');

        queueErrorTest("test replicate with 1st argument not exact integer",
                       "(replicate 2.1 \"World\")",
                       'replicate: expects a non-negative exact integer as 1st argument, but given: 21/10; other arguments were: "World"');

        queueErrorTest("test replicate with 2nd argument not string",
                       "(replicate 2 1)",
                       'replicate: expects a string as 2nd argument, but given: 1; other arguments were: 2');

//string

        queueErrorTest("test string with 1st argument not char",
                       "(string 1)",
                       'string: expects a char as 1st argument, but given: 1');

//string-length

        queueErrorTest("test string-length with wrong arity",
                       "(string-length)",
                       'string-length: expects 1 argument, but given 0');

        queueErrorTest("test string-length with 1st argument not string",
                       "(string-length 2)",
                       'string-length: expects a string as 1st argument, but given: 2');

//string-ref

        queueErrorTest("test string-ref with wrong arity",
                       "(string-ref)",
                       'string-ref: expects 2 arguments, but given 0');

        queueErrorTest("test string-ref with 1st argument not string",
                       "(string-ref 2 2)",
                       'string-ref: expects a string as 1st argument, but given: 2; other arguments were: 2');

        queueErrorTest("test string-ref with 1st argument not string",
                       "(string-ref \"hello\" \"world\")",
                       'string-ref: expects a non-negative exact integer as 2nd argument, but given: "world"; other arguments were: "hello"');

        //out of bounds


//string=?

        queueErrorTest("test string=? with 1st argument not string",
                       "(string=? 42 \"hello\")",
                       'string=?: expects a string as 1st argument, but given: 42; other arguments were: "hello"');

        queueErrorTest("test string=? with 2nd argument not string",
                       "(string=? \"thing\" 42)",
                       'string=?: expects a string as 2nd argument, but given: 42; other arguments were: "thing"');

        queueErrorTest("test string=? with wrong arity",
                       "(string=?)",
                       'string=?: expects at least 2 arguments, but given 0');

//string-ci=?

        queueErrorTest("test string-ci=? with wrong arity",
                       "(string-ci=?)",
                       'string-ci=?: expects at least 2 arguments, but given 0');

        queueErrorTest("test string-ci=? with 1st argument not string",
                       "(string-ci=? 4 \"thing\")",
                       'string-ci=?: expects a string as 1st argument, but given: 4; other arguments were: "thing"');

        queueErrorTest("test string-ci=? with 1st argument not string",
                       "(string-ci=? \"thing\" 2)",
                       'string-ci=?: expects a string as 2nd argument, but given: 2; other arguments were: "thing"');

//string<?

        queueErrorTest("test string<? with wrong arity",
                       "(string<?)",
                       'string<?: expects at least 2 arguments, but given 0');

        queueErrorTest("test string<? with 1st argument not string",
                       "(string<? \"thing\" 4)",
                       'string<?: expects a string as 2nd argument, but given: 4; other arguments were: "thing"');

        queueErrorTest("test string<? with 1st argument not string",
                       "(string<? 4 \"thing\")",
                       'string<?: expects a string as 1st argument, but given: 4; other arguments were: "thing"');

//string>?

        queueErrorTest("test string>? with wrong arity",
                       "(string>?)",
                       'string>?: expects at least 2 arguments, but given 0');

        queueErrorTest("test string>? with 1st argument not string",
                       "(string>? 3 \"thing\")",
                       'string>?: expects a string as 1st argument, but given: 3; other arguments were: "thing"');

        queueErrorTest("test string>? with 1st argument not string",
                       "(string>? \"thing\" 3)",
                       'string>?: expects a string as 2nd argument, but given: 3; other arguments were: "thing"');


//string<=?

        queueErrorTest("test string<=? with wrong arity",
                       "(string<=?)",
                       'string<=?: expects at least 2 arguments, but given 0');

        queueErrorTest("test string<=? with 1st argument not string",
                       "(string<=? 3 \"thing\")",
                       'string<=?: expects a string as 1st argument, but given: 3; other arguments were: "thing"');

        queueErrorTest("test string>? with 1st argument not string",
                       "(string>? \"thing\" 3)",
                       'string>?: expects a string as 2nd argument, but given: 3; other arguments were: "thing"');

//string>=?

        queueErrorTest("test string>=? with wrong arity",
                       "(string>=?)",
                       'string>=?: expects at least 2 arguments, but given 0');

        queueErrorTest("test string>=? with 1st argument not string",
                       "(string>=? 2 \"thing\")",
                       'string>=?: expects a string as 1st argument, but given: 2; other arguments were: "thing"');

        queueErrorTest("test string>=? with 1st argument not string",
                       "(string>=? \"thing\" 2)",
                       'string>=?: expects a string as 2nd argument, but given: 2; other arguments were: "thing"');


//string-ci<?

        queueErrorTest("test string-ci<? with wrong arity",
                       "(string-ci<?)",
                       'string-ci<?: expects at least 2 arguments, but given 0');

        queueErrorTest("test string-ci<? with 1st argument not string",
                       "(string-ci<? 1 \"thing\")",
                       'string-ci<?: expects a string as 1st argument, but given: 1; other arguments were: "thing"');

        queueErrorTest("test string-ci<? with 1st argument not string",
                       "(string-ci<? \"thing\" 2)",
                       'string-ci<?: expects a string as 2nd argument, but given: 2; other arguments were: "thing"');


//string-ci>?

        queueErrorTest("test string-ci>? with wrong arity",
                       "(string-ci>?)",
                       'string-ci>?: expects at least 2 arguments, but given 0');

        queueErrorTest("test string-ci>? with 1st argument not string",
                       "(string-ci>? 1 \"thing\")",
                       'string-ci>?: expects a string as 1st argument, but given: 1; other arguments were: "thing"');

        queueErrorTest("test string-ci>? with 1st argument not string",
                       "(string-ci>? \"thing\" 2)",
                       'string-ci>?: expects a string as 2nd argument, but given: 2; other arguments were: "thing"');

//string-ci<=?

        queueErrorTest("test string-ci<=? with wrong arity",
                       "(string-ci<=?)",
                       'string-ci<=?: expects at least 2 arguments, but given 0');

        queueErrorTest("test string-ci<=? with 1st argument not string",
                       "(string-ci<=? 1 \"thing\")",
                       'string-ci<=?: expects a string as 1st argument, but given: 1; other arguments were: "thing"');

        queueErrorTest("test string-ci<=? with 1st argument not string",
                       "(string-ci<=? \"thing\" 2)",
                       'string-ci<=?: expects a string as 2nd argument, but given: 2; other arguments were: "thing"');

//string-ci>=?

        queueErrorTest("test string-ci>=? with wrong arity",
                       "(string-ci>=?)",
                       'string-ci>=?: expects at least 2 arguments, but given 0');

        queueErrorTest("test string-ci>=? with 1st argument not string",
                       "(string-ci>=? 1 \"thing\")",
                       'string-ci>=?: expects a string as 1st argument, but given: 1; other arguments were: "thing"');

        queueErrorTest("test string-ci>=? with 1st argument not string",
                       "(string-ci>=? \"thing\" 2)",
                       'string-ci>=?: expects a string as 2nd argument, but given: 2; other arguments were: "thing"');

//substring

        queueErrorTest("test substring with wrong arity",
                       "(substring)",
                       'substring: expects 2 or 3 arguments, but given 0');

        queueErrorTest("test substring with 1st argument not string",
                       "(substring 1 1 2)",
                       'substring: expects a string as 1st argument, but given: 1; other arguments were: 1 2');

        queueErrorTest("test substring with 2nd argument not string",
                       "(substring \"hello\" \"world\" 2)",
                       'substring: expects a non-negative exact integer as 2nd argument, but given: "world"; other arguments were: "hello" 2');

        queueErrorTest("test substring with 3rd argument not string",
                       "(substring \"hello\" 2 \"world\")",
                       'substring: expects a non-negative exact integer as 3rd argument, but given: "world"; other arguments were: "hello" 2');                

        queueErrorTest("test substring with index out of bounds",
                       "(substring \"thing\" 0 53)",
                       'substring: ending index 53 out of range [0, 5] for string: "thing"');                


//string-append

        queueErrorTest("test string-append with first argument not a string",
                       "(string-append 1 \"2\")",
                       'string-append: expects a string as 1st argument, but given: 1; other arguments were: "2"');

        queueErrorTest("test string-append with an argument not a string",
                       "(string-append \"1\" \"2\" \"3\" \"4\" 5)",
                       'string-append: expects a string as 5th argument, but given: 5; other arguments were: "1" "2" "3" "4"');

//string->list

        queueErrorTest("test string->list with wrong arity",
                       "(string->list)",
                       'string->list: expects 1 argument, but given 0');

        queueErrorTest("test string->list with first argument not a string",
                       "(string->list 2)",
                       'string->list: expects a string as 1st argument, but given: 2');

//list->string

        queueErrorTest("test list->string with first argument not a string",
                       "(list->string)",
                       'list->string: expects 1 argument, but given 0');

        queueErrorTest("test list->string with first argument not list of char",
                       "(list->string (list 1 2 3))",
                       'list->string: expects a list of char as 1st argument, but given: (list 1 2 3)');

//string-copy

        queueErrorTest("test string-copy with wrong arity",
                       "(string-copy)",
                       'string-copy: expects 1 argument, but given 0');

        queueErrorTest("test string-copy with 1st argument not string",
                       "(string-copy 2)",
                       'string-copy: expects a string as 1st argument, but given: 2');

//string->symbol

        queueErrorTest("test string->symbol with wrong arity",
                       "(string->symbol)",
                       'string->symbol: expects 1 argument, but given 0');

        queueErrorTest("test string->symbol with 1st argument not string",
                       "(string->symbol 2)",
                       'string->symbol: expects a string as 1st argument, but given: 2');

//symbol->string

        queueErrorTest("test symbol->string with wrong arity",
                       "(symbol->string)",
                       'symbol->string: expects 1 argument, but given 0');

        queueErrorTest("test symbol->string with 1st argument not string",
                       "(symbol->string 2)",
                       'symbol->string: expects a symbol as 1st argument, but given: 2');

//format

        queueErrorTest("test format with wrong arity",
                       "(format)",
                       'format: expects at least 1 argument, but given 0');

        queueErrorTest("test format with 1st argument not string",
                       "(format 1)",
                       'format: expects a string as 1st argument, but given: 1');

//printf

        queueErrorTest("test bad inputs to big-bang",
                       "(big-bang 1 on-tick add1)",
                       "big-bang: expects a handler or attribute list as 2nd argument, but given: #<procedure:on-tick>; other arguments were: 1 #<procedure:add1>");

        queueErrorTest("too many arguments",
                       "(define (f x) (* x x)) (f 3 4)",
                       "f: expects 1 argument, but given 2: 3 4");

        queueErrorTest("test printf with wrong arity",
                       "(printf)",
                       'printf: expects at least 1 argument, but given 0');

        queueErrorTest("test printf with 1st argument not string",
                       "(printf 1)",
                       'printf: expects a string as 1st argument, but given: 1');

//string->int

        queueErrorTest("test string->int with wrong arity",
                       "(string->int)",
                       'string->int: expects 1 argument, but given 0');

        queueErrorTest("test string->int with 1st argument not string",
                       "(string->int 1)",
                       'string->int: expects a 1-letter string as 1st argument, but given: 1');

        queueErrorTest("test string->int with 1st argument not 1-letter string",
                       "(string->int \"23\")",
                       'string->int: expects a 1-letter string as 1st argument, but given: "23"');

//int->string

        queueErrorTest("test int->string with wrong arity",
                       "(int->string)",
                       'int->string: expects 1 argument, but given 0');

        queueErrorTest("test int->string with 1st argument not exact integer",
                       "(int->string \"1\")",
                       'int->string: expects an exact integer in [0,55295] or [57344,1114111] as 1st argument, but given: "1"');

//explode

        queueErrorTest("explode with wrong arity",
                       "(explode)",
                       'explode: expects 1 argument, but given 0');

        queueErrorTest("test explode with 1st argument not string",
                       "(explode 123)",
                       'explode: expects a string as 1st argument, but given: 123');

//implode

        queueErrorTest("implode with wrong arity",
                       "(implode)",
                       'implode: expects 1 argument, but given 0');

        queueErrorTest("test implode with 1st argument not list of 1-letter strings",
                       "(implode \"h235s\")",
                       'implode: expects a list of 1-letter strings as 1st argument, but given: "h235s"');

//string-alphabetic? 

        queueErrorTest("string-alphabetic? with wrong arity",
                       "(string-alphabetic?)",
                       'string-alphabetic?: expects 1 argument, but given 0');

        queueErrorTest("string-alphabetic? 1st argument not string",
                       "(string-alphabetic? 123)",
                       'string-alphabetic?: expects a string as 1st argument, but given: 123');

//string-ith
    
        queueErrorTest("string-ith with wrong arity",
                       "(string-ith)",
                       'string-ith: expects 2 arguments, but given 0');

        queueErrorTest("string-ith 1st argument not string",
                       "(string-ith 1 2)",
                       'string-ith: expects a string as 1st argument, but given: 1; other arguments were: 2');

        queueErrorTest("string-ith 2nd argument not exact integer",
                       "(string-ith \"hello\" 1.5)",
                       'string-ith: expects an exact integer in [0, length of the given string minus 1 (4)] as 2nd argument, but given: 3/2; other arguments were: "hello"');

        queueErrorTest("string-ith index out of bounds",
                       "(string-ith \"hello\" 5)",
                       'string-ith: expects an exact integer in [0, length of the given string minus 1 (4)] as 2nd argument, but given: 5; other arguments were: "hello"');

//string-lower-case?

        queueErrorTest("string-lower-case? with wrong arity",
                       "(string-lower-case?)",
                       'string-lower-case?: expects 1 argument, but given 0');

        queueErrorTest("string-lower-case? with 1st argument not string",
                       "(string-lower-case? 2)",
                       'string-lower-case?: expects a string as 1st argument, but given: 2');

//string-numeric?

        queueErrorTest("string-numeric? with wrong arity",
                       "(string-numeric?)",
                       'string-numeric?: expects 1 argument, but given 0');

        queueErrorTest("tring-numeric? with 1st argument not string",
                       "(string-numeric? 2)",
                       'string-numeric?: expects a string as 1st argument, but given: 2');


//string-upper-case?

        queueErrorTest("string-upper-case? with wrong arity",
                       "(string-upper-case?)",
                       'string-upper-case?: expects 1 argument, but given 0');

        queueErrorTest("string-upper-case? with 1st argument not string",
                       "(string-upper-case? 2)",
                       'string-upper-case?: expects a string as 1st argument, but given: 2');
//string-whitespace?

        queueErrorTest("string-whitespace? with wrong arity",
                       "(string-whitespace?)",
                       'string-whitespace?: expects 1 argument, but given 0');

        queueErrorTest("string-whitespace? with 1st argument not string",
                       "(string-whitespace? 2)",
                       'string-whitespace?: expects a string as 1st argument, but given: 2');

//build-string

        queueErrorTest("build-string with wrong arity",
                       "(build-string)",
                       'build-string: expects 2 arguments, but given 0');

        queueErrorTest("build-string? with 1st argument not non-negative exact integer",
                       "(build-string \"hello\" 2)",
                       'build-string: expects a non-negative exact integer as 1st argument, but given: "hello"; other arguments were: 2');

        queueErrorTest("build-string? with 2nd argument not a proc",
                       "(build-string 5 \"hello\")",
                       'build-string: expects a procedure as 2nd argument, but given: "hello"; other arguments were: 5');

//string->immutable-string DNE

//string-set! DNE

//string-fill! DNE

/*PRIMITIVES['make-bytes'] =

PRIMITIVES['bytes'] =

PRIMITIVES['bytes->immutable-bytes'] =

PRIMITIVES['bytes-length'] =

PRIMITIVES['bytes-ref'] =

PRIMITIVES['bytes-set!'] =

PRIMITIVES['subbytes'] =

PRIMITIVES['bytes-copy'] =

PRIMITIVES['bytes-fill!'] =

PRIMITIVES['bytes-append'] =

PRIMITIVES['bytes->list'] =

PRIMITIVES['list->bytes'] =

PRIMITIVES['bytes=?'] =

PRIMITIVES['bytes<?'] =

PRIMITIVES['bytes>?'] = ALL DNE */

//PRIMITIVES['make-vector']

        queueErrorTest("make-vector with wrong arity",
                       "(make-vector)",
                       'make-vector: expects 2 arguments, but given 0');

        queueErrorTest("make-vector with 1st argument not non-negative exact integer",
                       "(make-vector \"size\" 2)",
                       'make-vector: expects a non-negative exact integer as 1st argument, but given: "size"; other arguments were: 2');

//PRIMITIVES['vector']

//PRIMITIVES['vector-length']

        queueErrorTest("vector-length with wrong arity",
                       "(vector-length)",
                       'vector-length: expects 1 argument, but given 0');

        queueErrorTest("vector-length with 1st argument not vector",
                       "(vector-length 1)",
                       'vector-length: expects a vector as 1st argument, but given: 1');

//PRIMITIVES['vector-ref']

        queueErrorTest("vector-ref with wrong arity",
                       "(vector-ref)",
                       'vector-ref: expects 2 arguments, but given 0');

        queueErrorTest("vector-ref with 1st argument not vector",
                       "(vector-ref 1 2)",
                       'vector-ref: expects a vector as 1st argument, but given: 1; other arguments were: 2');

        queueErrorTest("vector-ref with 2nd argument not non-negative ",
                       "(vector-ref (make-vector 1) 2.2)",
                       'make-vector: expects 2 arguments, but given 1: 1');

        queueErrorTest("vector-ref with index out of bounds",
                       "(vector-ref (vector 1) 7)",
                       'vector-ref: index 7 out of range [0, 0] for vector: #(1)');

//PRIMITIVES['vector-set!'] 

        queueErrorTest("vector-set! with wrong arity",
                       "(vector-set! )",
                       'vector-set!: expects 3 arguments, but given 0');

        queueErrorTest("vector-length with 1st argument not vector",
                       "(vector-length 1)",
                       'vector-length: expects a vector as 1st argument, but given: 1');


//PRIMITIVES['vector->list']

        queueErrorTest("vector->list with wrong arity",
                       "(vector->list)",
                       'vector->list: expects 1 argument, but given 0');

        queueErrorTest("vector->list with 1st argument not vector",
                       "(vector->list 1)",
                       'vector->list: expects a vector as 1st argument, but given: 1');

//PRIMITIVES['list->vector']

        queueErrorTest("build-vector with wrong arity",
                       "(build-vector)",
                       'build-vector: expects 2 arguments, but given 0');

        queueErrorTest("list->vector with 1st argument not vector",
                       "(list->vector 1)",
                       'list->vector: expects a list as 1st argument, but given: 1');

//PRIMITIVES['build-vector']

        queueErrorTest("build-vector with wrong arity",
                       "(build-vector)",
                       'build-vector: expects 2 arguments, but given 0');

        queueErrorTest("build-vector with 1st argument not non-negative exact integer",
                       "(build-vector \"hello\" 2)",
                       'build-vector: expects a non-negative exact integer as 1st argument, but given: "hello"; other arguments were: 2');

        queueErrorTest("build-vector with 2nd argument not a proc",
                       "(build-vector \"hello\" 2)",
                       'build-vector: expects a non-negative exact integer as 1st argument, but given: "hello"; other arguments were: 2');


//PRIMITIVES['char=?']

        queueErrorTest("char=? with wrong arity",
                       "(char=?)",
                       'char=?: expects at least 2 arguments, but given 0');

        queueErrorTest("char=? with 1st argument not char",
                       '(char=? "hello")',
                       'char=?: expects at least 2 arguments, but given 1: hello');

//PRIMITIVES['char<?'] 

        queueErrorTest("char<? with wrong arity",
                       "(char<?)",
                       'char<?: expects at least 2 arguments, but given 0');

        queueErrorTest("char<? with 1st argument not char",
                       "(char<? add1 #\\a)",
                       'char<?: expects a char as 1st argument, but given: #<procedure:add1>; other arguments were: #\\a');

        queueErrorTest("char<? with 2nd argument not char",
                       "(char<? #\\a add1)",
                       'char<?: expects a char as 2nd argument, but given: #<procedure:add1>; other arguments were: #\\a');

//PRIMITIVES['char>?'] 

        queueErrorTest("char>? with wrong arity",
                       "(char>?)",
                       'char>?: expects at least 2 arguments, but given 0');

        queueErrorTest("char>? with 1st argument not char",
                       "(char>? add1 #\\a)",
                       'char>?: expects a char as 1st argument, but given: #<procedure:add1>; other arguments were: #\\a');

        queueErrorTest("char>? with 2nd argument not char",
                       "(char>? #\\a add1)",
                       'char>?: expects a char as 2nd argument, but given: #<procedure:add1>; other arguments were: #\\a');

//PRIMITIVES['char<=?']

        queueErrorTest("char<=? with wrong arity",
                       "(char<=?)",
                       'char<=?: expects at least 2 arguments, but given 0');

        queueErrorTest("char<=? with 1st argument not char",
                       "(char<=? add1 #\\a)",
                       'char<=?: expects a char as 1st argument, but given: #<procedure:add1>; other arguments were: #\\a');

        queueErrorTest("char<=? with 2nd argument not char",
                       "(char<=? #\\a add1)",
                       'char<=?: expects a char as 2nd argument, but given: #<procedure:add1>; other arguments were: #\\a');

//PRIMITIVES['char>=?']

        queueErrorTest("char>=? with wrong arity",
                       "(char>=?)",
                       'char>=?: expects at least 2 arguments, but given 0');

        queueErrorTest("char>=? with 1st argument not char",
                       "(char>=? add1 #\\a)",
                       'char>=?: expects a char as 1st argument, but given: #<procedure:add1>; other arguments were: #\\a');

        queueErrorTest("char>=? with 2nd argument not char",
                       "(char>=? #\\a add1)",
                       'char>=?: expects a char as 2nd argument, but given: #<procedure:add1>; other arguments were: #\\a');


//PRIMITIVES['char-ci=?'] 

        queueErrorTest("char-ci=? with wrong arity",
                       "(char-ci=?)",
                       'char-ci=?: expects at least 2 arguments, but given 0');

        queueErrorTest("char-ci=? with 1st argument not char",
                       "(char-ci=? add1 #\\a)",
                       'char-ci=?: expects a char as 1st argument, but given: #<procedure:add1>; other arguments were: #\\a');

        queueErrorTest("char-ci=? with 2nd argument not char",
                       "(char-ci=? #\\a add1)",
                       'char-ci=?: expects a char as 2nd argument, but given: #<procedure:add1>; other arguments were: #\\a');


//PRIMITIVES['char-ci<?'] 

        queueErrorTest("char-ci<? with wrong arity",
                       "(char-ci<?)",
                       'char-ci<?: expects at least 2 arguments, but given 0');

        queueErrorTest("char-ci<? with 1st argument not char",
                       "(char-ci<? add1 #\\a)",
                       'char-ci<?: expects a char as 1st argument, but given: #<procedure:add1>; other arguments were: #\\a');

        queueErrorTest("char-ci<? with 2nd argument not char",
                       "(char-ci<? #\\a add1)",
                       'char-ci<?: expects a char as 2nd argument, but given: #<procedure:add1>; other arguments were: #\\a');

//PRIMITIVES['char-ci>?'] 

        queueErrorTest("char-ci>? with wrong arity",
                       "(char-ci>?)",
                       'char-ci>?: expects at least 2 arguments, but given 0');

        queueErrorTest("char-ci>? with 1st argument not char",
                       "(char-ci>? add1 #\\a)",
                       'char-ci>?: expects a char as 1st argument, but given: #<procedure:add1>; other arguments were: #\\a');

        queueErrorTest("char-ci>? with 2nd argument not char",
                       "(char-ci>? #\\a add1)",
                       'char-ci>?: expects a char as 2nd argument, but given: #<procedure:add1>; other arguments were: #\\a');

//PRIMITIVES['char-ci<=?'] 

        queueErrorTest("char-ci<=? with wrong arity",
                       "(char-ci<=?)",
                       'char-ci<=?: expects at least 2 arguments, but given 0');

        queueErrorTest("char-ci<=? with 1st argument not char",
                       "(char-ci<=? add1 #\\a)",
                       'char-ci<=?: expects a char as 1st argument, but given: #<procedure:add1>; other arguments were: #\\a');

        queueErrorTest("char-ci<=? with 2nd argument not char",
                       "(char-ci<=? #\\a add1)",
                       'char-ci<=?: expects a char as 2nd argument, but given: #<procedure:add1>; other arguments were: #\\a');

//PRIMITIVES['char-ci>=?'] 

        queueErrorTest("char-ci>=? with wrong arity",
                       "(char-ci>=?)",
                       'char-ci>=?: expects at least 2 arguments, but given 0');

        queueErrorTest("char-ci>=? with 1st argument not char",
                       "(char-ci>=? add1 #\\a)",
                       'char-ci>=?: expects a char as 1st argument, but given: #<procedure:add1>; other arguments were: #\\a');

        queueErrorTest("char-ci>=? with 2nd argument not char",
                       "(char-ci>=? #\\a add1)",
                       'char-ci>=?: expects a char as 2nd argument, but given: #<procedure:add1>; other arguments were: #\\a');

//PRIMITIVES['char-alphabetic?'] 

        queueErrorTest("char-alphabetic? with wrong arity",
                       "(char-alphabetic?)",
                       'char-alphabetic?: expects 1 argument, but given 0');

        queueErrorTest("char-alphabetic? with 1st argument not char",
                       "(char-alphabetic? add1)",
                       'char-alphabetic?: expects a char as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['char-numeric?'] 

        queueErrorTest("char-numeric? with wrong arity",
                       "(char-numeric?)",
                       'char-numeric?: expects 1 argument, but given 0');

        queueErrorTest("char-numeric? with 1st argument not char",
                       "(char-numeric? add1)",
                       'char-numeric?: expects a char as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['char-whitespace?']

        queueErrorTest("char-whitespace? with wrong arity",
                       "(char-whitespace?)",
                       'char-whitespace?: expects 1 argument, but given 0');

        queueErrorTest("char-whitespace? with 1st argument not char",
                       "(char-whitespace? add1)",
                       'char-whitespace?: expects a char as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['char-upper-case?'] 

        queueErrorTest("char-upper-case? with wrong arity",
                       "(char-upper-case?)",
                       'char-upper-case?: expects 1 argument, but given 0');

        queueErrorTest("char-upper-case? with 1st argument not char",
                       "(char-upper-case? add1)",
                       'char-upper-case?: expects a char as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['char-lower-case?'] 

        queueErrorTest("char-lower-case? with wrong arity",
                       "(char-lower-case?)",
                       'char-lower-case?: expects 1 argument, but given 0');

        queueErrorTest("char-lower-case? with 1st argument not char",
                       "(char-lower-case? add1)",
                       'char-lower-case?: expects a char as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['char->integer'] 

        queueErrorTest("char->integer with wrong arity",
                       "(char->integer)",
                       'char->integer: expects 1 argument, but given 0');

        queueErrorTest("char->integer with 1st argument not char",
                       "(char->integer add1)",
                       'char->integer: expects a char as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['integer->char'] 

        queueErrorTest("integer->char with wrong arity",
                       "(integer->char)",
                       'integer->char: expects 1 argument, but given 0');

        queueErrorTest("integer->char with 1st argument not integer",
                       "(integer->char add1)",
                       'integer->char: expects an exact integer in [0,#x10FFFF], not in [#xD800,#xDFFF] as 1st argument, but given: #<procedure:add1>');
//perhaps change the error message so hex does not show

//PRIMITIVES['char-upcase']

        queueErrorTest("char-upcaser with wrong arity",
                       "(char-upcase)",
                       'char-upcase: expects 1 argument, but given 0');

        queueErrorTest("char-upcase with 1st argument not char",
                       "(char-upcase add1)",
                       'char-upcase: expects a char as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['char-downcase'] 

        queueErrorTest("char-downcase with wrong arity",
                       "(char-downcase)",
                       'char-downcase: expects 1 argument, but given 0');

        queueErrorTest("char-downcase with 1st argument not char",
                       "(char-downcase add1)",
                       'char-downcase: expects a char as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['make-posn'] 

        queueErrorTest("make-posn with wrong arity",
                       "(make-posn)",
                       'make-posn: expects 2 arguments, but given 0');

//PRIMITIVES['posn-x']

        queueErrorTest("posn-x with wrong arity",
                       "(posn-x)",
                       'posn-x: expects 1 argument, but given 0');

        queueErrorTest("posn-x with 1st argument not posn",
                       "(posn-x add1)",
                       'posn-x: expects a posn as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['posn-y'] 

        queueErrorTest("posn-y with wrong arity",
                       "(posn-y)",
                       'posn-y: expects 1 argument, but given 0');

        queueErrorTest("posn-y with 1st argument not posn",
                       "(posn-y add1)",
                       'posn-y: expects a posn as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['key=?'] 

        queueErrorTest("key=? with wrong arity",
                       "(key=?)",
                       'key=?: expects 2 arguments, but given 0');

//PRIMITIVES['image?'] 

        queueErrorTest("image? with wrong arity",
                       "(image?)",
                       'image?: expects 1 argument, but given 0');

//PRIMITIVES['make-color']

        queueErrorTest("make-color with wrong arity",
                       "(make-color)",
                       'make-color: expects 3 or 4 arguments, but given 0');

        queueErrorTest("make-color with 1st argument not a number between 0 and 255",
                       "(make-color 256 1 2 3)",
                       'make-color: expects a number between 0 and 255 as 1st argument, but given: 256; other arguments were: 1 2 3');

        queueErrorTest("make-color with 2nd argument not a number between 0 and 255",
                       "(make-color 255 256 2 3)",
                       'make-color: expects a number between 0 and 255 as 2nd argument, but given: 256; other arguments were: 255 2 3');


        queueErrorTest("make-color with 3rd argument not a number between 0 and 255",
                       "(make-color 255 255 256 3)",
                       'make-color: expects a number between 0 and 255 as 3rd argument, but given: 256; other arguments were: 255 255 3');

        queueErrorTest("make-color with 4th argument not a number between 0 and 255",
                       "(make-color 255 255 255 256)",
                       'make-color: expects a number between 0 and 255 as 4th argument, but given: 256; other arguments were: 255 255 255');

//PRIMITIVES['color-red']

        queueErrorTest("color-red with wrong arity",
                       "(color-red)",
                       'color-red: expects 1 argument, but given 0');

        queueErrorTest("color-red with 1st argument not color",
                       "(color-red add1)",
                       'color-red: expects a color as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['color-green'] 

        queueErrorTest("color-green with wrong arity",
                       "(color-green)",
                       'color-green: expects 1 argument, but given 0');

        queueErrorTest("color-green with 1st argument not color",
                       "(color-green add1)",
                       'color-green: expects a color as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['color-blue'] 

        queueErrorTest("color-blue with wrong arity",
                       "(color-blue)",
                       'color-blue: expects 1 argument, but given 0');

        queueErrorTest("color-blue with 1st argument not color",
                       "(color-blue add1)",
                       'color-blue: expects a color as 1st argument, but given: #<procedure:add1>');

//PRIMITIVES['color-alpha']

        queueErrorTest("color-alpha with wrong arity",
                       "(color-alpha)",
                       'color-alpha: expects 1 argument, but given 0');

        queueErrorTest("color-alpha with 1st argument not color",
                       "(color-alpha add1)",
                       'color-alpha: expects a color as 1st argument, but given: #<procedure:add1>');


//PRIMITIVES['empty-scene'] 

        queueErrorTest("empty-scene with wrong arity",
                       "(empty-scene)",
                       'empty-scene: expects 2 arguments, but given 0');

        queueErrorTest("empty-scene with 1st argument not non-negative number",
                       "(empty-scene add1 2)",
                       'empty-scene: expects a non-negative number as 1st argument, but given: #<procedure:add1>; other arguments were: 2');

        queueErrorTest("empty-scene with 2nd argument not non-negative number",
                       "(empty-scene 0 add1)",
                       'empty-scene: expects a non-negative number as 2nd argument, but given: #<procedure:add1>; other arguments were: 0');

//PRIMITIVES['place-image']

        queueErrorTest("empty-scene with wrong arity",
                       "(empty-scene)",
                       'empty-scene: expects 2 arguments, but given 0');

        queueErrorTest("empty-scene with 1st argument not non-negative number",
                       "(empty-scene add1 2)",
                       'empty-scene: expects a non-negative number as 1st argument, but given: #<procedure:add1>; other arguments were: 2');

        queueErrorTest("empty-scene with 2nd argument not non-negative number",
                       "(empty-scene 0 add1)",
                       'empty-scene: expects a non-negative number as 2nd argument, but given: #<procedure:add1>; other arguments were: 0');

//PRIMITIVES['place-image/align']

        queueErrorTest("place-image/align with wrong arity",
                       "(place-image/align)",
                       'place-image/align: expects 6 arguments, but given 0');

        queueErrorTest("place-image/align with 1st argument not image",
                       "(place-image/align add1 2 3 4 5 6)",
                       'place-image/align: expects an image as 1st argument, but given: #<procedure:add1>; other arguments were: 2 3 4 5 6');

        queueErrorTest("place-image/align with 2nd argument not real number",
                       "(place-image/align (circle 50 \"solid\" \"red\") \"hello\" 3 4 5 6)",
                       'place-image/align: expects a real number as 2nd argument, but given: "hello"; other arguments were: <image> 3 4 5 6');

        queueErrorTest("place-image/align with 3rd argument not real number",
                       "(place-image/align (circle 50 \"solid\" \"red\") 2 \"hello\" 4 5 6)",
                       'place-image/align: expects a real number as 3rd argument, but given: "hello"; other arguments were: <image> 2 4 5 6');

        queueErrorTest("place-image/align with 4th argument not x-place",
                       "(place-image/align (circle 50 \"solid\" \"red\") 2 3 (make-posn 2 3) 5 6)",
                       'place-image/align: expects a x-place as 4th argument, but given: (posn 2 3); other arguments were: <image> 2 3 5 6');

        queueErrorTest("place-image/alignwith 5th argument not y-place",
                       "(place-image/align (circle 50 \"solid\" \"red\") 2 3 \"left\" 5 6)",
                       'place-image/align: expects a y-place as 5th argument, but given: 5; other arguments were: <image> 2 3 "left" 6');

        queueErrorTest("place-image/align with 6th argument not image",
                       "(place-image/align (circle 50 \"solid\" \"red\") 2 3 \"left\" \"top\" add1)",
                       'place-image/align: expects an image as 6th argument, but given: #<procedure:add1>; other arguments were: <image> 2 3 "left" "top"');

//PRIMITIVES['scene+line'] 

        queueErrorTest("scene+line with wrong arity",
                       "(scene+line)",
                       'scene+line: expects 6 arguments, but given 0');


//PRIMITIVES['put-pinhole'] 

        queueErrorTest("put-pinhole with wrong arity",
                       "(put-pinhole)",
                       'put-pinhole: expects 3 arguments, but given 0');

        queueErrorTest("put-pinhole with 1st argument not image",
                       "(put-pinhole 1 2 3)",
                       'put-pinhole: expects an image as 1st argument, but given: 1; other arguments were: 2 3');

        queueErrorTest("put-pinhole with 2nd argument not image",
                       "(put-pinhole (circle 50 \"solid\" \"red\") add1 3)",
                       'put-pinhole: expects a real as 2nd argument, but given: #<procedure:add1>; other arguments were: <image> 3');

        queueErrorTest("put-pinhole with 3rd argument not image",
                       "(put-pinhole (circle 50 \"solid\" \"red\") 1 add1)",
                       'put-pinhole: expects a real as 3rd argument, but given: #<procedure:add1>; other arguments were: <image> 1');

//PRIMITIVES['circle']

        queueErrorTest("circle with wrong arity",
                       "(circle)",
                       'circle: expects 3 arguments, but given 0');

        queueErrorTest("circle with 1st argument not non-negative number",
                       "(circle \"foo\" 2 3)",
                       'circle: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 2 3');

        queueErrorTest("circle with 2nd argument not style",
                       "(circle 1 2 3)",
                       'circle: expects a style as 2nd argument, but given: 2; other arguments were: 1 3');

        queueErrorTest("circle with 3rd argument not colour",
                       "(circle 1 \"solid\" add1)",
                       'circle: expects a color as 3rd argument, but given: #<procedure:add1>; other arguments were: 1 "solid"');

//PRIMITIVES['star']

        queueErrorTest("star with wrong arity",
                       "(star)",
                       'star: expects 5 or 3 arguments, but given 0');

        queueErrorTest("star with 1st argument not non-negative number",
                       "(star \"hello\" 2 3)",
                       'star: expects a non-negative number as 1st argument, but given: "hello"; other arguments were: 2 3');

        queueErrorTest("star with 2nd argument not image",
                       "(star 1 2 3)",
                       'star: expects a style as 2nd argument, but given: 2; other arguments were: 1 3');

        queueErrorTest("star with 3rd argument not colour",
                       "(star 1 \"solid\" add1)",
                       'star: expects a color as 3rd argument, but given: #<procedure:add1>; other arguments were: 1 "solid"');

//PRIMITIVES['radial-star'] 

        queueErrorTest("radial-star with wrong arity",
                       "(radial-star)",
                       'radial-star: expects 5 arguments, but given 0');

        queueErrorTest("radial-star with 1st argument not positive integer greater than or equal to 2",
                       "(radial-star 1 2 3 4 5)",
                       'radial-star: expects a positive integer greater than or equal to 2 as 1st argument, but given: 1; other arguments were: 2 3 4 5');

        queueErrorTest("star with 2nd argument not positive number",
                       "(radial-star 5 \"foo\" 3 4 5)",
                       'radial-star: expects a positive number as 2nd argument, but given: "foo"; other arguments were: 5 3 4 5');

        queueErrorTest("star with 3rd argument not positive number",
                       "(radial-star 5 4 \"foo\" 4 5)",
                       'radial-star: expects a positive number as 3rd argument, but given: "foo"; other arguments were: 5 4 4 5');

        queueErrorTest("star with 4th argument not style",
                       "(radial-star 5 4 2 \"foo\" 5)",
                       'radial-star: expects a style as 4th argument, but given: "foo"; other arguments were: 5 4 2 5');

        queueErrorTest("star with 5th argument not colour",
                       "(radial-star 5 4 2 \"solid\" \"foo\")",
                       'radial-star: expects a color as 5th argument, but given: "foo"; other arguments were: 5 4 2 "solid"');

//PRIMITIVES['nw:rectangle']

        queueErrorTest("nw:rectangle wrong arity",
                       "(nw:rectangle)",
                       'nw:rectangle: expects 4 arguments, but given 0');

        queueErrorTest("radial-star with 1st argument non-negative number",
                       "(nw:rectangle \"foo\" 2 3 4)",
                       'nw:rectangle: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 2 3 4');

        queueErrorTest("star with 2nd argument not non-negative number",
                       "(nw:rectangle 2 \"foo\" 3 4)",
                       'nw:rectangle: expects a non-negative number as 2nd argument, but given: "foo"; other arguments were: 2 3 4');

        queueErrorTest("star with 3rd argument not style",
                       "(nw:rectangle 2 5 add1 4)",
                       'nw:rectangle: expects a style as 3rd argument, but given: #<procedure:add1>; other arguments were: 2 5 4');

        queueErrorTest("star with 4th argument not colour",
                       "(nw:rectangle 2 5 \"outline\" \"focus\")",
                       'nw:rectangle: expects a color as 4th argument, but given: "focus"; other arguments were: 2 5 "outline"');

// PRIMITIVES['rectangle'] 

        queueErrorTest("rectangle wrong arity",
                       "(rectangle)",
                       'rectangle: expects 4 arguments, but given 0');

        queueErrorTest("rectangle with 1st argument non-negative number",
                       "(rectangle \"foo\" 2 3 4)",
                       'rectangle: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 2 3 4');

        queueErrorTest("rectangle with 2nd argument not non-negative number",
                       "(rectangle 2 \"foo\" 3 4)",
                       'rectangle: expects a non-negative number as 2nd argument, but given: "foo"; other arguments were: 2 3 4');

        queueErrorTest("rectangle with 3rd argument not style",
                       "(rectangle 2 5 add1 4)",
                       'rectangle: expects a style as 3rd argument, but given: #<procedure:add1>; other arguments were: 2 5 4');

        queueErrorTest("rectangle with 4th argument not colour",
                       "(rectangle 2 5 \"outline\" \"focus\")",
                       'rectangle: expects a color as 4th argument, but given: "focus"; other arguments were: 2 5 "outline"');

// PRIMITIVES['regular-polygon'] 

        queueErrorTest("regular-polygon wrong arity",
                       "(regular-polygon)",
                       'regular-polygon: expects 4 arguments, but given 0');

        queueErrorTest("rectangle with 1st argument not non-negative number",
                       "(regular-polygon \"foo\" 2 3 4)",
                       'regular-polygon: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 2 3 4');

        queueErrorTest("rectangle with 2nd argument not positive integer greater than or equal to 3",
                       "(regular-polygon 2 \"foo\" 3 4)",
                       'regular-polygon: expects a positive integer greater than or equal to 3 as 2nd argument, but given: "foo"; other arguments were: 2 3 4');

        queueErrorTest("regular-polygon with 3rd argument not style",
                       "(regular-polygon 2 5 add1 4)",
                       'regular-polygon: expects a style as 3rd argument, but given: #<procedure:add1>; other arguments were: 2 5 4');

        queueErrorTest("regular-polygonwith 4th argument not colour",
                       "(regular-polygon 2 5 \"outline\" \"focus\")",
                       'regular-polygon: expects a color as 4th argument, but given: "focus"; other arguments were: 2 5 "outline"');

// PRIMITIVES['star-polygon'] 

        queueErrorTest("star-polygon wrong arity",
                       "(star-polygon)",
                       'star-polygon: expects 5 arguments, but given 0');

        queueErrorTest("star-polygon with 1st argument not non-negative number",
                       "(star-polygon \"foo\" 2 3 4 5)",
                       'star-polygon: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 2 3 4 5');

        queueErrorTest("star-polygon with 2nd argument not positive integer greater than or equal to 3",
                       "(star-polygon 2 \"foo\" 3 4 5)",
                       'star-polygon: expects a positive integer greater than or equal to 3 as 2nd argument, but given: "foo"; other arguments were: 2 3 4 5');

        queueErrorTest("star-polygon with 3rd argument not positive integer greater than or equal to 1",
                       "(star-polygon 2 5 add1 4 5)",
                       'star-polygon: expects a positive integer greater than or equal to 1 as 3rd argument, but given: #<procedure:add1>; other arguments were: 2 5 4 5');

        queueErrorTest("star-polygon with 4th argument not style",
                       "(star-polygon 2 5 5 add1 5)",
                       'star-polygon: expects a style as 4th argument, but given: #<procedure:add1>; other arguments were: 2 5 5 5');

        queueErrorTest("star-polygon with 5th argument not colour",
                       "(star-polygon 2 5 5 \"outline\" \"focus\")",
                       'star-polygon: expects a color as 5th argument, but given: "focus"; other arguments were: 2 5 5 "outline"');

// PRIMITIVES['rhombus'] 

        queueErrorTest("rhombus wrong arity",
                       "(rhombus)",
                       'rhombus: expects 4 arguments, but given 0');

        queueErrorTest("rhombus with 1st argument non-negative number",
                       "(rhombus \"foo\" 2 3 4)",
                       'rhombus: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 2 3 4');

        queueErrorTest("star with 2nd argument not non-negative number",
                       "(rhombus 2 \"foo\" 3 4)",
                       'rhombus: expects a non-negative number as 2nd argument, but given: "foo"; other arguments were: 2 3 4');

        queueErrorTest("rhombus with 3rd argument not style",
                       "(rhombus 2 5 add1 4)",
                       'rhombus: expects a style as 3rd argument, but given: #<procedure:add1>; other arguments were: 2 5 4');

        queueErrorTest("rhombus with 4th argument not colour",
                       "(rhombus 2 5 \"outline\" \"focus\")",
                       'rhombus: expects a color as 4th argument, but given: "focus"; other arguments were: 2 5 "outline"');


// PRIMITIVES['square'] 

        queueErrorTest("square wrong arity",
                       "(square)",
                       'square: expects 3 arguments, but given 0');

        queueErrorTest("square with 1st argument non-negative number",
                       "(square \"foo\" 3 4)",
                       'square: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 3 4');

        queueErrorTest("square with 2nd argument not style",
                       "(square 2 add1 4)",
                       'square: expects a style as 2nd argument, but given: #<procedure:add1>; other arguments were: 2 4');

        queueErrorTest("square with 3rd argument not colour",
                       "(square 2 \"outline\" \"focus\")",
                       'square: expects a color as 3rd argument, but given: "focus"; other arguments were: 2 "outline"');

// PRIMITIVES['triangle'] 

        queueErrorTest("triangle wrong arity",
                       "(triangle)",
                       'triangle: expects 3 arguments, but given 0');

        queueErrorTest("triangle with 1st argument non-negative number",
                       "(triangle \"foo\" 3 4)",
                       'triangle: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 3 4');

        queueErrorTest("triangle with 2nd argument not style",
                       "(triangle 2 add1 4)",
                       'triangle: expects a style as 2nd argument, but given: #<procedure:add1>; other arguments were: 2 4');

        queueErrorTest("triangle with 3rd argument not colour",
                       "(triangle 2 \"outline\" \"focus\")",
                       'triangle: expects a color as 3rd argument, but given: "focus"; other arguments were: 2 "outline"');

// PRIMITIVES['right-triangle'] 

        queueErrorTest("right-triangle wrong arity",
                       "(right-triangle)",
                       'right-triangle: expects 4 arguments, but given 0');

        queueErrorTest("right-triangle with 1st argument non-negative number",
                       "(right-triangle \"foo\" 3 4 3)",
                       'right-triangle: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 3 4 3');

        queueErrorTest("right-triangle with 2nd argument non-negative number",
                       "(right-triangle 5 \"foo\" 3 4)",
                       'right-triangle: expects a non-negative number as 2nd argument, but given: "foo"; other arguments were: 5 3 4');

        queueErrorTest("right-triangle with 3rd argument not style",
                       "(right-triangle 2 4 add1 4)",
                       'right-triangle: expects a style as 3rd argument, but given: #<procedure:add1>; other arguments were: 2 4 4');

        queueErrorTest("right-triangle with 4th argument not colour",
                       "(right-triangle 5 2 \"outline\" \"focus\")",
                       'right-triangle: expects a color as 4th argument, but given: "focus"; other arguments were: 5 2 "outline"');

// PRIMITIVES['isosceles-triangle'] 


        queueErrorTest("isosceles-triangle wrong arity",
                       "(isosceles-triangle)",
                       'isosceles-triangle: expects 4 arguments, but given 0');

        queueErrorTest("isosceles-triangle with 1st argument not non-negative number",
                       "(isosceles-triangle \"foo\" 3 4 3)",
                       'isosceles-triangle: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 3 4 3');

        queueErrorTest("isosceles-triangle with 2nd argument not finite real number between 0 and 360",
                       "(isosceles-triangle 5 \"foo\" 3 4)",
                       'isosceles-triangle: expects a finite real number between 0 and 360 as 2nd argument, but given: "foo"; other arguments were: 5 3 4');

        queueErrorTest("isosceles-triangle with 3rd argument not style",
                       "(isosceles-triangle 2 4 add1 4)",
                       'isosceles-triangle: expects a style as 3rd argument, but given: #<procedure:add1>; other arguments were: 2 4 4');

        queueErrorTest("isosceles-triangle with 4th argument not colour",
                       "(isosceles-triangle 5 2 \"outline\" \"focus\")",
                       'isosceles-triangle: expects a color as 4th argument, but given: "focus"; other arguments were: 5 2 "outline"');

// PRIMITIVES['ellipse'] 

        queueErrorTest("ellipse wrong arity",
                       "(ellipse)",
                       'ellipse: expects 4 arguments, but given 0');

        queueErrorTest("ellipse with 1st argument not non-negative number",
                       "(ellipse \"foo\" 3 4 3)",
                       'ellipse: expects a non-negative number as 1st argument, but given: "foo"; other arguments were: 3 4 3');

        queueErrorTest("ellipse with 2nd argument not non-negative number",
                       "(ellipse 5 \"foo\" 3 4)",
                       'ellipse: expects a non-negative number as 2nd argument, but given: "foo"; other arguments were: 5 3 4');

        queueErrorTest("ellipse with 3rd argument not string",
                       "(ellipse 2 4 add1 4)",
                       'ellipse: expects a string as 3rd argument, but given: #<procedure:add1>; other arguments were: 2 4 4');

        queueErrorTest("ellipse with 4th argument not colour",
                       "(ellipse 5 2 \"outline\" \"focus\")",
                       'ellipse: expects a color as 4th argument, but given: "focus"; other arguments were: 5 2 "outline"');

// PRIMITIVES['line'] 

        queueErrorTest("line wrong arity",
                       "(line)",
                       'line: expects 3 arguments, but given 0');

        queueErrorTest("line 1st argument not finite real",
                       "(line \"foo\" 3 4)",
                       'line: expects a finite real number as 1st argument, but given: "foo"; other arguments were: 3 4');

        queueErrorTest("line with 2nd argument not finite real",
                       "(line 5 \"foo\" 3)",
                       'line: expects a finite real number as 2nd argument, but given: "foo"; other arguments were: 5 3');

        queueErrorTest("line with 3rd argument not colour",
                       "(line 2 4 add1)",
                       'line: expects a color as 3rd argument, but given: #<procedure:add1>; other arguments were: 2 4');

        //////////////////////////////////////////////////////////////////////



        sys.print("Running asynchronous tests...\n");
        runAsyncTests(0, function(){



            /**
               This next test is special and should be last.  It'll run an infinite loop, and
               schedule a break.

               Only after the interpreter breaks do we print "END TESTS".
            */
            runRawTest("closure application, testing break",
	               // (define (f) (f)) (begin (f)) --> infinite loop, but with bounded control stack.
	               function() {
	                   var state = new runtime.State();
	                   state.pushControl(makeMod(makePrefix(1), []));
	                   run(state);   
	                   state.pushControl(makeApplication(makeToplevel(0, 0), []));
	                   state.pushControl(makeDefValues([makeToplevel(0, 0)],
					                   makeLam(0, [0],
						                   makeApplication(makeToplevel(0, 0),
								                   []))));
	                   var isTerminated = false;
	                   interpret.run(state,
			                 function() {
			                 }, 
			                 function(err) {			                     assert.ok(types.isSchemeError(err));
			                     assert.ok(types.isExnBreak(err.val));
			                     isTerminated = true;
			                 });
	                   var waitTillBreak = function() {
		               if (isTerminated) {
		                   sys.print("\nEND TESTS\n")
		                   return;
		               } else {
		                   state.breakRequested = true;
		                   setTimeout(waitTillBreak, 10);
		               }
	                   };
	                   waitTillBreak();
	               });


        });

        
    };

}