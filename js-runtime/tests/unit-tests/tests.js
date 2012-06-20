//////////////////////////////////////////////////////////////////////


var run = function(state) {
	while (!state.isStuck()) {
	    runtime.step(state);
	}
	return state.v;
}

var step = runtime.step;


//////////////////////////////////////////////////////////////////////

var EXIT_ON_FIRST_ERROR = true;


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

var runTest = function(name, thunk) {
    sys.print("running " + name + "... ");
    try {
	thunk();
    } catch(e) {
	sys.print(" FAIL\n");
	sys.print(e);
	if (EXIT_ON_FIRST_ERROR) {
	    if (typeof(console) !== 'undefined' && console.log && e.stack) {
			console.log(e.stack);
		}
//		if (typeof(console) !== 'undefined' && console.log && e.stack) {
//			console.log(e.stack);
//		}
//		sys.print(sys.inspect(e) + '\n');
	    throw e;
	}
    }
    sys.print(" ok\n")
    
};

//////////////////////////////////////////////////////////////////////


sys.print("START TESTS\n\n");

runTest("simple empty state",
	// Simple running should just terminate, and always be at the "stuck" state.
	function() { 
	    var state = new runtime.State();
	    assert.ok(state.isStuck());
	    run(state);
	    assert.ok(state.isStuck());
	});



// Numeric constants should just evaluate through.
runTest("Numeric constant", 
	function() {
	    var state = new runtime.State();
	    state.pushControl(makeConstant(42));
	    var result = run(state);
	    assert.deepEqual(result, 
			     42);
	    
	    assert.deepEqual(state, makeStateWithConstant(42));
	});



// String constant.
runTest("String constant",
	function() {
	    var state = new runtime.State();
	    state.pushControl(makeConstant("hello world"));
	    var result = run(state);
	    assert.deepEqual(result, 
			     "hello world");

	    assert.deepEqual(state, makeStateWithConstant("hello world"));
	});


// boolean constant.
runTest("Boolean constant", 
	function() {
	    var state = new runtime.State();
	    state.pushControl(makeConstant(true));
	    var result = run(state);
	    assert.deepEqual(result, true);

	    assert.deepEqual(state, makeStateWithConstant(true));
	});



runTest("external call",
	function() {
	    var state = new runtime.State();
	    interpret.call(state, 
			   primitive.getPrimitive("*"),
			   [2, 3],
			   function(v) { assert.equal(v, 6) });
	});



// Simple branch to true
runTest("Simple boolean branch to true",
	function() {
	    var state = new runtime.State();
	    state.pushControl(makeBranch(makeConstant(true),
					 makeConstant(true),
					 makeConstant(false)));
	    var result = run(state);
	    assert.deepEqual(result, true);
	});


// Simple branch to false
runTest("Simple boolean branch to false",
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
runTest("nested booleans",
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
runTest("Sequences",
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
runTest("module prefix",
	function() {
	    var state = new runtime.State();
	    state.pushControl(makeMod(makePrefix(3),
				      []));
	    run(state);   
	    assert.equal(1, state.vstack.length);
	    assert.ok(state.vstack[0] instanceof types.PrefixValue);
	    assert.equal(state.vstack[0].length(), 3);
	});


runTest("toplevel lookup",
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



runTest("define-values",
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


runTest("lambda",
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



runTest("primval (current-print)",
	// primval
	function() {
	    var state = new runtime.State();
	    state.pushControl(makePrimval("current-print"));
	    var result = run(state);
	    assert.ok(result instanceof runtime.Primitive);
	});


runTest("primval on bad primitive should throw error",
	// primval on unknowns should throw error
	function() {
	    var state = new runtime.State();
	    state.pushControl(makePrimval("foobar"));
	    assert.throws(function() { run(state); });
	});


runTest("Primval on *",
	// primval on *
	// primval
	function() {
	    var state = new runtime.State();
	    state.pushControl(makePrimval("*"));
	    var result = run(state);
	    assert.ok(result instanceof runtime.Primitive);
	});


runTest("My own list function",
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


runTest("primitive application",
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


runTest("primitive application, no arguments",
	// primitive application with no arguments.
	function() {
	    var state = new runtime.State();
	    state.pushControl(makeApplication(makePrimval("*"),
					      []));
	    var result = run(state);
	    assert.deepEqual(result, runtime.rational(1));
	    assert.equal(state.vstack.length, 0);
	});


runTest("primitive application, nested application",
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


runTest("primitive appliation, nesting, testing non-commutativity",
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

runTest("primitive application, subtraction",
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

runTest("primitive application, unary subtraction (negation)", 
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


runTest("closure application",
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


runTest("closure application, defining square",
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



runTest("closure application, testing tail calls",
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



runTest("closure application, testing tail calls with even/odd",
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


runTest("factorial",
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



runTest("apply on a primitive *",
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



runTest("apply on a primitive -",
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

runTest("apply on a primitive -, three arguments",
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


runTest("values",
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



runTest("values with no arguments",
	function() {
	    var state = new runtime.State();
	    state.pushControl(makeApplication(
		makePrimval("values"),[]));
	    var result = run(state);
	    assert.equal(state.vstack.length, 0);
	    assert.ok(result instanceof runtime.ValuesWrapper);
	    assert.equal(result.elts.length, 0);
	});




runTest("current-inexact-milliseconds",
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




runTest("values with def-values",
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



runTest("apply-values",
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



runTest("apply-values, testing no stack usage",
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

runTest("let-one, trivial",
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


runTest("let-one, different body",
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


runTest("let-void, no boxes",
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


runTest("let-void, with boxes",
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


runTest("beg0 with just one argument should immediately reduce to its argument",
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



runTest("beg0, more general",
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



runTest("boxenv",
	function() {
	    var state = new runtime.State();
	    state.pushControl(makeLet1(makeConstant("foo"),
				       makeBoxenv(0, 
						  makeLocalRef(0))));
	    var result = run(state);
	    assert.ok( runtime.isBox(result) );
	    assert.deepEqual(result, runtime.box("foo"));
	});


runTest("install-value, without boxes",
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



runTest("install-value, with boxes",
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


runTest("assign",
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


runTest("varref",
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


runTest("closure",
	function() {
	    var state = new runtime.State();
	    state.heap['some-closure'] = 42;
	    state.pushControl(makeClosure('some-closure'));
	    // The way we process closures in bytecode-compiler
	    // should make this a direct heap lookup.
	    assert.equal(run(state), 42);
	});


runTest("with-cont-mark", 
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




runTest("closure application, testing tail calls in the presence of continuation marks",
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


runTest("case-lambda, with a function that consumes one or two values",
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



// runTest("factorial again, testing the accumulation of continuation marks",
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


runTest("let-rec",
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

runTest('symbol?',
	function() {
		testPrim('symbol?', runtime.symbol, ['hi'], true);
		testPrim('symbol?', runtime.rational, [1], false);
	});

runTest('symbol=?',
	function() {
		testPrim('symbol=?', runtime.symbol, ['abc', 'abd'], false);
		testPrim('symbol=?', runtime.symbol, ['cdf', 'cdf'], true);
	});

runTest('string->symbol',
	function() {
		testPrim('string->symbol', id, ['hello!'], runtime.symbol('hello!'));
		testPrim('string->symbol', runtime.string, [' world'], runtime.symbol(' world'));
	});


runTest('symbol->string',
	function() {
		testPrim('symbol->string', runtime.symbol, ['hello!'], runtime.string('hello!'));
	});


runTest('number->string',
	function() {
		testPrim('number->string', runtime.rational, [5], runtime.string('5'));
		testPrim('number->string', id, [runtime.complex(0, 2)], runtime.string('0+2i'));
		testPrim('number->string', id, [runtime.rational(5, 3)], runtime.string('5/3'));
	});


runTest('stinrg->number',
	function() {
		testPrim('string->number', runtime.string, ['abc'], false);
		testPrim('string->number', id, ['123'], 123);
		testPrim('string->number', runtime.string, ['0+3i'], runtime.complex(0, 3));
	});


runTest('string?',
	function() {
		testPrim('string?', id, [runtime.symbol('hello!')], false);
		testPrim('string?', id, ['string'], true);
		testPrim('string?', runtime.string, ['world'], true);
	});


runTest('make-string',
	function() {
		testPrim('make-string', id, [0, runtime.char('A')], runtime.string(""));
		testPrim('make-string', id, [runtime.rational(3), runtime.char('b')], runtime.string('bbb'));
	});


runTest('string',
	function() {
		testPrim('string', id, [], runtime.string(''));
		testPrim('string', runtime.char, ['a', 'b'], runtime.string('ab'));
	});

runTest('string-length',
	function() {
		testPrim('string-length', runtime.string, [''], 0);
		testPrim('string-length', id, ['5'], 1);
		testPrim('string-length', runtime.string, ['antidisestablishmentarianism'], 28);
	});

runTest('string-ref',
	function() {
		testPrim('string-ref', id, ['world', 3], runtime.char('l'));
		testPrim('string-ref', id, [runtime.string('abcd'), 1], runtime.char('b'));
		testPrim('string-ref', id, [runtime.string('asdfasdf'), 4], runtime.char('a'));
	});

runTest('string=?',
	function() {
		testPrim('string=?', id, ['asdf', 'Asdf'], false);
		testPrim('string=?', id, ['asdf', runtime.string('asdf')], true);
		testPrim('string=?', runtime.string, ['asdf', 'asdf', 'Asdf'], false);
		testPrim('string=?', runtime.string, ['far', 'fAr'], false);
		testPrim('string=?', id, ['', ''], true);
		testPrim('string=?', runtime.string, ['as', 'as', 'as'], true);
		testPrim('string=?', runtime.string, ['1', '1', '2'], false);
	});

runTest('string-ci=?',
	function() {
		testPrim('string-ci=?', id, ['asdf', 'Asdf'], true);
		testPrim('string-ci=?', id, ['asdf', runtime.string('asdf')], true);
		testPrim('string-ci=?', runtime.string, ['asdf', 'asdf', 'Asdf'], true);
		testPrim('string-ci=?', runtime.string, ['far', 'fAr'], true);
		testPrim('string-ci=?', id, ['', ''], true);
		testPrim('string-ci=?', runtime.string, ['as', 'as', 'as'], true);
		testPrim('string-ci=?', runtime.string, ['1', '1', '2'], false);
	});

runTest('string<?',
	function() {
		testPrim('string<?', id, ["", "a"], true);
		testPrim('string<?', runtime.string, ['abc', 'ab'], false);
		testPrim('string<?', id, [runtime.string('abc'), 'abc'], false);
		testPrim('string<?', runtime.string, ['abc', 'def', 'cde'], false);
		testPrim('string<?', id, ['A', runtime.string(']'), 'a'], true);
		testPrim('string<?', runtime.string, ['a', 'b', 'c', 'd', 'dd', 'e'], true);
	});

runTest('string>?',
	function() {
		testPrim('string>?', id, ["", "a"], false);
		testPrim('string>?', runtime.string, ['abc', 'ab'], true);
		testPrim('string>?', id, [runtime.string('abc'), 'abc'], false);
		testPrim('string>?', runtime.string, ['abc', 'def', 'cde'], false);
		testPrim('string>?', id, ['a', runtime.string(']'), 'A'], true);
		testPrim('string>?', runtime.string, ['e', 'd', 'cc', 'c', 'b', 'a'], true);
	});

runTest('string<=?',
	function() {
		testPrim('string<=?', id, ["", "a"], true);
		testPrim('string<=?', runtime.string, ['abc', 'ab'], false);
		testPrim('string<=?', id, [runtime.string('abc'), 'abc'], true);
		testPrim('string<=?', runtime.string, ['abc', 'aBc'], false);
		testPrim('string<=?', runtime.string, ['abc', 'def', 'cde'], false);
		testPrim('string<=?', id, ['A', runtime.string(']'), 'a'], true);
		testPrim('string<=?', runtime.string, ['a', 'b', 'b', 'd', 'dd', 'e'], true);
	});

runTest('string>=?',
	function() {
		testPrim('string>=?', id, ["", "a"], false);
		testPrim('string>=?', runtime.string, ['abc', 'ab'], true);
		testPrim('string>=?', id, [runtime.string('abc'), 'abc'], true);
		testPrim('string>=?', runtime.string, ['aBc', 'abc'], false);
		testPrim('string>=?', runtime.string, ['abc', 'def', 'cde'], false);
		testPrim('string>=?', id, ['a', runtime.string(']'), 'A'], true);
		testPrim('string>=?', runtime.string, ['e', 'e', 'cc', 'c', 'b', 'a'], true);
	});

runTest('string-ci<?',
	function() {
		testPrim('string-ci<?', id, ["", "a"], true);
		testPrim('string-ci<?', id, [runtime.string('Abc'), 'ab'], false);
		testPrim('string-ci<?', runtime.string, ['abc', 'abc'], false);
		testPrim('string-ci<?', runtime.string, ['abc', 'def', 'cde'], false);
		testPrim('string-ci<?', runtime.string, ['a', 'b', 'C', 'd', 'dd', 'e'], true);
	});

runTest('string-ci>?',
	function() {
		testPrim('string-ci>?', id, ["", "a"], false);
		testPrim('string-ci>?', id, [runtime.string('Abc'), 'ab'], true);
		testPrim('string-ci>?', runtime.string, ['abc', 'abc'], false);
		testPrim('string-ci>?', runtime.string, ['def', 'abc', 'cde'], false);
		testPrim('string-ci>?', runtime.string, ['e', 'D', 'cc', 'c', 'b', 'a'], true);
	});

runTest('string-ci<=?',
	function() {
		testPrim('string-ci<=?', id, ["", "a"], true);
		testPrim('string-ci<=?', runtime.string, ['Abc', 'ab'], false);
		testPrim('string-ci<=?', id, [runtime.string('abc'), 'abc'], true);
		testPrim('string-ci<=?', runtime.string, ['abc', 'aBc'], true);
		testPrim('string-ci<=?', runtime.string, ['abc', 'def', 'cde'], false);
		testPrim('string-ci<=?', runtime.string, ['a', 'b', 'b', 'D', 'dd', 'e'], true);
	});

runTest('string-ci>=?',
	function() {
		testPrim('string-ci>=?', id, ["", "a"], false);
		testPrim('string-ci>=?', runtime.string, ['Abc', 'ab'], true);
		testPrim('string-ci>=?', id, [runtime.string('abc'), 'abc'], true);
		testPrim('string-ci>=?', runtime.string, ['aBc', 'abc'], true);
		testPrim('string-ci>=?', runtime.string, ['def', 'abc', 'cde'], false);
		testPrim('string-ci>=?', runtime.string, ['e', 'e', 'cc', 'C', 'b', 'a'], true);
	});


runTest('substring',
	function() {
		testPrim('substring', id, ['abc', 1], runtime.string('bc'));
		testPrim('substring', id, [runtime.string('abc'), 0], runtime.string('abc'));
		testPrim('substring', id, ['abcdefgh', 2, 4], runtime.string('cd'));
		testPrim('substring', id, [runtime.string('abc'), 3], runtime.string(''));
		testPrim('substring', id, [runtime.string('abcd'), 2, 2], runtime.string(''));
	});


runTest('string-append',
	function() {
		testPrim('string-append', runtime.string, [], runtime.string(''));
		testPrim('string-append', id, ['a', runtime.string('b'), 'c'], runtime.string('abc'));
		testPrim('string-append', runtime.string, ['a', '', 'b', ' world'], runtime.string('ab world'));
	});


runTest('string->list',
	function() {
		testPrim('string->list', runtime.string, [''], runtime.EMPTY);
		testPrim('string->list', id, ['one'], runtime.list([runtime.char('o'), runtime.char('n'), runtime.char('e')]));
		testPrim('string->list', runtime.string, ['two'], runtime.list([runtime.char('t'),
										runtime.char('w'),
										runtime.char('o')]));
	});

runTest('list->string',
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


runTest('string-copy',
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


runTest('format',
	function() {
		testPrim('format', runtime.string, ['hello'], runtime.string('hello'));
		testPrim('format', id, ['hello~n'], runtime.string('hello\n'));
		testPrim('format', id, [runtime.string('Test: ~a~nTest2: ~A~%'),
					runtime.char('A'),
					runtime.list([1, 2, 3])],
			 runtime.string('Test: A\nTest2: (1 2 3)\n'));
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


runTest('explode',
	function() {
		testPrim('explode', id, [''], runtime.EMPTY);
		testPrim('explode', runtime.string, ['hello'], runtime.list([runtime.string('h'),
									     runtime.string('e'),
									     runtime.string('l'),
									     runtime.string('l'),
									     runtime.string('o')]));
	});


runTest('implode',
	function() {
		testPrim('implode', id, [runtime.EMPTY], runtime.string(''));
		testPrim('implode', runtime.list, [[runtime.string('h'),
						    runtime.string('e'),
						    runtime.string('l'),
						    runtime.string('l'),
						    runtime.string('o')]],
			 runtime.string('hello'));
	});


runTest('string->int',
	function() {
		testPrim('string->int', runtime.string, ['0'], 48);
		testPrim('string->int', runtime.string, ['\n'], 10);
	});


runTest('int->string',
	function() {
		testPrim('int->string', id, [50], runtime.string('2'));
		testPrim('int->string', id, [10], runtime.string('\n'));
	});


runTest('string-alphabetic?',
	function() {
		testPrim('string-alphabetic?', id, ['abcd'], true);
		testPrim('string-alphabetic?', runtime.string, ['AbCZ'], true);
		testPrim('string-alphabetic?', id, ['a b c'], false);
		testPrim('string-alphabetic?', runtime.string, ['1243!'], false);
	});


runTest('string-ith',
	function() {
		testPrim('string-ith', id, ['abcde', 2], runtime.string('c'));
		testPrim('string-ith', id, [runtime.string('12345'), 0], runtime.string('1'));
	});


runTest('string-lower-case?',
	function() {
		testPrim('string-lower-case?', runtime.string, ['abcd'], true);
		testPrim('string-lower-case?', id, ['abc1'], false);
		testPrim('string-lower-case?', runtime.string, ['Abc'], false);
	});


runTest('string-numeric?',
	function() {
		testPrim('string-numeric?', id, ['1234'], true);
		testPrim('string-numeric?', runtime.string, ['5432'], true);
		testPrim('string-numeric?', runtime.string, ['0+2i'], false);
		testPrim('string-numeric?', runtime.string, ['03()'], false);
	});


runTest('string-upper-case?',
	function() {
		testPrim('string-upper-case?', id, ['ABCD'], true);
		testPrim('string-upper-case?', runtime.string, ['ADF'], true);
		testPrim('string-upper-case?', runtime.string, ['AbZ'], false);
		testPrim('string-upper-case?', runtime.string, ['05AB'], false);
	});


runTest('string-whitespace?',
	function() {
		testPrim('string-whitespace?', runtime.string, ['a b c'], false);
		testPrim('string-whitespace?', id, [' \n '], true);
		testPrim('string-whitespace?', runtime.string, ['\t\r\n '], true);
	});


runTest('replicate',
	function() {
		testPrim('replicate', id, [3, runtime.string('ab')], runtime.string('ababab'))
		testPrim('replicate', id, [0, 'hi'], runtime.string(''));
		testPrim('replicate', id, [50, runtime.string('')], runtime.string(''));
	});


runTest('string->immutable-string',
	function() {
		testPrim('string->immutable-string', id, ['hello'], 'hello');
		testPrim('string->immutable-string', runtime.string, ['world'], 'world');
	});


runTest('string-set!',
	function() {
		var str1 = runtime.string('hello');
		testPrim('string-set!', id, [str1, 2, runtime.char('w')], runtime.VOID);
		assert.deepEqual(str1, runtime.string('hewlo'));

		var str2 = runtime.string('no');
		testPrim('string-set!', id, [str2, 1, runtime.char('!')], runtime.VOID);
		assert.deepEqual(str2, runtime.string('n!'));
	});


runTest('string-fill!',
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


runTest("zero?",
	function() {
		testPrim('zero?', runtime.rational, [0], true);
		testPrim('zero?', runtime.rational, [1], false);
		testPrim('zero?', id, [runtime.complex(0, 1)], false);
	});



runTest("sub1",
	function() {
		testPrim('sub1', runtime.rational, [25], runtime.rational(24));
		testPrim('sub1', id, [runtime.complex(3, 5)], runtime.complex(2, 5));
	});


runTest("add1",
	function() {
		testPrim('add1', runtime.rational, [25], runtime.rational(26));
		testPrim('add1', id, [runtime.complex(3, 5)], runtime.complex(4, 5));
	});


runTest("+",
	function() {
		testPrim('+', runtime.rational, [], runtime.rational(0));
		testPrim('+', runtime.rational, [2], runtime.rational(2));
		testPrim('+', runtime.rational, [1, 2], runtime.rational(3));
		testPrim('+', runtime.rational, [1, 2, 3, 4], runtime.rational(10));
	});


runTest("-",
	function() {
		testPrim('-', runtime.rational, [2], runtime.rational(-2));
		testPrim('-', runtime.rational, [1, 2], runtime.rational(-1));
		testPrim('-', runtime.rational, [1, 2, 3, 4], runtime.rational(-8));
	});


runTest("*",
	function() {
		testPrim('*', runtime.rational, [], runtime.rational(1));
		testPrim('*', runtime.rational, [2], runtime.rational(2));
		testPrim('*', runtime.rational, [1, 2], runtime.rational(2));
		testPrim('*', runtime.rational, [1, 2, 3, 4], runtime.rational(24));
	});


runTest("/",
	function() {
		testPrim('/', runtime.rational, [2], runtime.rational(1, 2));
		testPrim('/', runtime.rational, [1, 3], runtime.rational(1, 3));
		testPrim('/', runtime.rational, [18, 2, 3, 4], runtime.rational(3, 4));
	});


runTest('abs',
	function() {
		testPrim('abs', runtime.rational, [2], runtime.rational(2));
		testPrim('abs', runtime.rational, [0], runtime.rational(0));
		testPrim('abs', runtime.rational, [-2], runtime.rational(2));
	});


runTest('quotient',
	function() {
		testPrim('quotient', runtime.rational, [5, 3], runtime.rational(1));
	});


runTest('remainder',
	function() {
		testPrim('remainder', runtime.rational, [5, 3], runtime.rational(2));
	});


runTest('modulo',
	function() {
	    testPrim('modulo', runtime.rational, [-5, 3], runtime.rational(1));
	});


runTest('=',
	function() {
	    testPrim('=', runtime.rational, [2, 3], false);
	    testPrim('=', runtime.rational, [2, 2, 2, 2], true);
	    testPrim('=', runtime.rational, [2, 2, 3, 3], false);
	});


runTest('<',
	function() {
	    testPrim('<', runtime.rational, [1, 2], true);
	    testPrim('<', runtime.rational, [2, 2], false);
	    testPrim('<', runtime.rational, [3, 2], false);
	    testPrim('<', runtime.rational, [1, 2, 3, 4], true);
	    testPrim('<', runtime.rational, [1, 2, 2, 3], false);
	    testPrim('<', runtime.rational, [1, 3, 5, 4], false);
	});


runTest('>',
	function() {
	    testPrim('>', runtime.rational, [1, 2], false);
	    testPrim('>', runtime.rational, [2, 2], false);
	    testPrim('>', runtime.rational, [3, 2], true);
	    testPrim('>', runtime.rational, [4, 3, 2, 1], true);
	    testPrim('>', runtime.rational, [4, 3, 3, 2], false);
	    testPrim('>', runtime.rational, [4, 3, 5, 2], false);
	});


runTest('<=',
	function() {
	    testPrim('<=', runtime.rational, [1, 2], true);
	    testPrim('<=', runtime.rational, [2, 2], true);
	    testPrim('<=', runtime.rational, [3, 2], false);
	    testPrim('<=', runtime.rational, [1, 2, 3, 4], true);
	    testPrim('<=', runtime.rational, [2, 3, 3, 3], true);
	    testPrim('<=', runtime.rational, [1, 3, 5, 4], false);
	});


runTest('>=',
	function() {
	    testPrim('>=', runtime.rational, [1, 2], false);
	    testPrim('>=', runtime.rational, [2, 2], true);
	    testPrim('>=', runtime.rational, [3, 2], true);
	    testPrim('>=', runtime.rational, [4, 3, 2, 1], true);
	    testPrim('>=', runtime.rational, [4, 3, 3, 2], true);
	    testPrim('>=', runtime.rational, [5, 3, 5, 4], false);
	});


runTest('positive?',
	function() {
		testPrim('positive?', runtime.rational, [-1], false);
		testPrim('positive?', runtime.rational, [0], false);
		testPrim('positive?', runtime.rational, [1], true);
	});


runTest('negative?',
	function() {
		testPrim('negative?', runtime.rational, [-1], true);
		testPrim('negative?', runtime.rational, [0], false);
		testPrim('negative?', runtime.rational, [1], false);
	});


runTest('max',
	function() {
		testPrim('max', runtime.rational, [1], runtime.rational(1));
		testPrim('max', runtime.rational, [1, 2], runtime.rational(2));
		testPrim('max', runtime.rational, [2, 1, 4, 3, 6, 2], runtime.rational(6));
	});


runTest('min',
	function() {
		testPrim('min', runtime.rational, [1], runtime.rational(1));
		testPrim('min', runtime.rational, [1, 2], runtime.rational(1));
		testPrim('min', runtime.rational, [2, 1, 4, 3, 6, 2], runtime.rational(1));
	});


runTest('=~',
	function() {
		testPrim('=~', id, [1, 2, 2], true);
		testPrim('=~', id, [1, 2, runtime.float(0.5)], false);
		testPrim('=~', runtime.rational, [5, 3, 1], false);
		testPrim('=~', runtime.rational, [5, 3, 4], true);
	});


runTest('conjugate',
	function() {
		testPrim('conjugate', id, [1], 1);
		testPrim('conjugate', id, [runtime.complex(3, 3)], runtime.complex(3, -3));
	});


runTest('magnitude',
	function() {
		testPrim('magnitude', id, [4], 4);
		testPrim('magnitude', id, [runtime.complex(3, 4)], 5);
		testPrim('magnitude', id, [runtime.float(3.5)], runtime.float(3.5));
		testPrim('magnitude', id, [runtime.rational(3, 5)], runtime.rational(3, 5));
		testPrim('magnitude', id, [runtime.complex(12, 5)], 13);
	});


runTest('number?',
	function() {
		testPrim('number?', id, [5], true);
		testPrim('number?', runtime.rational, [10], true);
		testPrim('number?', id, [runtime.rational(10, 3)], true);
		testPrim('number?', runtime.float, [10.5], true);
		testPrim('number?', id, [runtime.complex(5, 3)], true);
		testPrim('number?', id, ['string'], false);
	});


runTest('complex?',
	function() {
		testPrim('complex?', id, [5], true);
		testPrim('complex?', runtime.rational, [10], true);
		testPrim('complex?', id, [runtime.rational(10, 3)], true);
		testPrim('complex?', runtime.float, [10.5], true);
		testPrim('complex?', id, [runtime.complex(5, 3)], true);
		testPrim('complex?', id, ['string'], false);
	});


runTest('real?',
	function() {
		testPrim('real?', id, [5], true);
		testPrim('real?', runtime.rational, [10], true);
		testPrim('real?', id, [runtime.rational(10, 3)], true);
		testPrim('real?', runtime.float, [10.5], true);
		testPrim('real?', id, [runtime.complex(5, 3)], false);
		testPrim('real?', id, ['string'], false);
	});


runTest('rational?',
	function() {
		testPrim('rational?', id, [5], true);
		testPrim('rational?', runtime.rational, [10], true);
		testPrim('rational?', id, [runtime.rational(10, 3)], true);
		testPrim('rational?', runtime.float, [10.5], true);
		testPrim('rational?', runtime.float, [Math.sqrt(2)], true);
		testPrim('rational?', id, [runtime.complex(5, 3)], false);
		testPrim('rational?', id, ['string'], false);
	});


runTest('integer?',
	function() {
		testPrim('integer?', id, [5], true);
		testPrim('integer?', runtime.rational, [10], true);
		testPrim('integer?', id, [runtime.complex(5, 0)], true);
		testPrim('integer?', id, [runtime.rational(10, 3)], false);
		testPrim('integer?', runtime.float, [10.5], false);
		testPrim('integer?', id, [runtime.complex(5, 3)], false);
		testPrim('integer?', id, ['string'], false);
	});


runTest('exact?',
	function() {
		testPrim('exact?', id, [5], true);
		testPrim('exact?', id, [runtime.rational(4, 3)], true);
		testPrim('exact?', runtime.float, [10.0], false);
		testPrim('exact?', id, [runtime.complex(5, 2)], true);
		testPrim('exact?', id, [runtime.complex(runtime.float(5.2), runtime.float(0.1))], false);
	});


runTest('inexact?',
	function() {
		testPrim('inexact?', id, [5], false);
		testPrim('inexact?', id, [runtime.rational(4, 3)], false);
		testPrim('inexact?', runtime.float, [10.0], true);
		testPrim('inexact?', id, [runtime.complex(5, 2)], false);
		testPrim('inexact?', id, [runtime.complex(runtime.float(5.2), runtime.float(0.1))], true);
	});


runTest('odd? and even?',
	function() {
		testPrim('odd?', id, [5], true);
		testPrim('odd?', runtime.float, [10.0], false);
		testPrim('even?', id, [15], false);
		testPrim('even?', runtime.float, [13.0], false);
	});


runTest('gcd and lcm',
	function() {
		testPrim('gcd', id, [1001, 98], 7);
		testPrim('gcd', id, [6, 10, 15], 1);
		testPrim('lcm', id, [91, 77], 1001);
		testPrim('lcm', id, [6, 10, 15], 30);
	});


runTest('floor, ceiling, and round',
	function() {
		testPrim('floor', id, [14], 14);
		testPrim('floor', runtime.float, [12.56], 12);
		testPrim('ceiling', id, [13], 13);
		testPrim('ceiling', runtime.float, [12.23], 13);
		testPrim('ceiling', runtime.float, [12.00], 12);
		testPrim('round', id, [124], 124);
		testPrim('round', runtime.float, [12.432], 12);
		testPrim('round', runtime.float, [12.543], 13);
	});


runTest('numerator and denominator',
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


runTest('exp and log',
	function() {
		testPrim('exp', id, [0], 1);
		testPrim('exp', runtime.float, [0], runtime.float(1));
		testPrim('exp', id, [3], runtime.float(Math.exp(3)));
		testPrim('log', id, [1], 0);
		testPrim('log', runtime.float, [1], runtime.float(0));
		testPrim('log', id, [primitive.getPrimitive('e')], runtime.float(1));
	});


runTest('sin, cos, tan, asin, acos, atan',
	function() {
		testPrim('sin', id, [20], runtime.float(Math.sin(20)));
		testPrim('sin', id, [0], runtime.float(0));
		testPrim('cos', id, [0], runtime.float(1));
		testPrim('cos', runtime.float, [43], runtime.float(Math.cos(43)));
		testPrim('tan', runtime.float, [0], runtime.float(0));
		testPrim('tan', id, [-30], runtime.float(Math.tan(-30)));

		testPrim('asin', runtime.float, [-0.5], runtime.float(Math.asin(-0.5)));
		testPrim('acos', runtime.float, [0.53], runtime.float(Math.acos(0.53)));
		testPrim('atan', runtime.float, [-543], runtime.float(Math.atan(-543)));
	});


runTest('sqrt, integer-sqrt, and expt',
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


runTest('make-rectangular, make-polar, real-part, imag-part, angle',
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


runTest('exact->inexact and inexact->exact',
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


runTest('first, second, third, fourth, fifth, sixth, seventh, eighth',
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
		testPrim('first', id, [testList1], 1);
		testPrim('first', id, [testList2], runtime.list([1, 2]));
		
		testPrim('second', id, [testList1], 2);
		testPrim('second', id, [testList2], runtime.list([3, 4]));

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
	});




/*************************************
 *** Primitive List Function Tests ***
 *************************************/


runTest('cons, car, and cdr',
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


runTest('list?',
	function() {
		testPrim('list?', id, [runtime.EMPTY], true);
		testPrim('list?', id, [runtime.pair(1, runtime.EMPTY)], true);
		testPrim('list?', id, [runtime.list([1, 2, 0, 3, 2])], true);
		testPrim('list?', id, [runtime.pair(1, 4)], false);
		testPrim('list?', id, [runtime.complex(0, 2)], false);
	});


runTest('list',
	function() {
		testPrim('list', runtime.rational, [], runtime.EMPTY);
		testPrim('list', runtime.rational, [1], runtime.pair(runtime.rational(1), runtime.EMPTY));
		testPrim('list', runtime.rational, [1, 5, 3], runtime.list([runtime.rational(1),
									    runtime.rational(5),
									    runtime.rational(3)]));
	});


runTest('list*',
	function() {
		testPrim('list*', id, [runtime.EMPTY], runtime.EMPTY);
		testPrim('list*', id, [runtime.rational(1), runtime.pair(runtime.rational(2), runtime.EMPTY)],
			 runtime.list([runtime.rational(1), runtime.rational(2)]));
		testPrim('list*', id, [1, 2, 3, runtime.list([4, 5])], runtime.list([1, 2, 3, 4, 5]));
	});


runTest('length',
	function() {
		testPrim('length', id, [runtime.EMPTY], 0);
		testPrim('length', runtime.list, [[1]], 1);
		testPrim('length', runtime.list, [[1, 2, 3, 4]], 4);
	});


runTest('append',
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


runTest('reverse',
	function() {
		testPrim('reverse', id, [runtime.EMPTY], runtime.EMPTY);
		testPrim('reverse', id, [runtime.list([1])], runtime.list([1]));
		testPrim('reverse', id, [runtime.list([1, 2, 3, 4, 5])], runtime.list([5, 4, 3, 2, 1]));
	});


runTest('list-ref',
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


runTest('memq',
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


runTest('memv',
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


runTest('member',
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


runTest('remove',
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



runTest('map',
	function() {
		var state = new runtime.State();
		state.pushControl(makeApplication(makePrimval('map'),
						  [makePrimval('add1'),
						   makeConstant(runtime.list([1, 2, 3]))]));
		assert.deepEqual(run(state), runtime.list([2, 3, 4]));
	});

runTest('filter',
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


runTest('foldl',
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


runTest('foldr',
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



runTest('build-list',
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


runTest('argmax',
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


runTest('argmin',
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


runTest('quicksort',
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


runTest('compose',
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


runTest('caar, cadr, cdar, cddr, etc.',
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


runTest('box',
	function() {
		testPrim('box', id, [1], runtime.box(1));
		testPrim('box', runtime.string, ['abc'], runtime.box(runtime.string('abc')));
	});


runTest('box?',
	function() {
		testPrim('box?', runtime.box, [1], true);
		testPrim('box?', runtime.char, ['a'], false);
		testPrim('box?', id, [15], false);
	});


runTest('unbox',
	function() {
		testPrim('unbox', runtime.box, [2], 2);
		testPrim('unbox', runtime.box, [runtime.char('a')], runtime.char('a'));
	});


runTest('set-box!',
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


runTest('hash?',
	function() {
		testPrim('hash?', id, [1], false);
		testPrim('hash?', runtime.vector, [[1, 2, 3]], false);
		testPrim('hash?', runtime.hash, [runtime.EMPTY], true);
		testPrim('hash?', runtime.hashEq, [runtime.EMPTY], true);
		testPrim('hash?', runtime.hash, [runtime.list([runtime.pair(1, 2)])], true);
		testPrim('hash?', runtime.hashEq, [runtime.list([runtime.pair(1, 2)])], true);
	});


runTest('str',
	function() {
	    assert.equal(typeof(runtime.string('a')), 'object');
	});


runTest('make-hash',
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


runTest('make-hasheq',
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


runTest('hash-set!',
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


runTest('hash-ref',
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


runTest('hash-remove!',
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


runTest('hash-map',
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


runTest('hash-for-each',
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
								function(key, val) {
								  	ret.push( helpers.format('~s - ~s!~n', [key, val]) );
								}))]));
		assert.deepEqual(run(state), runtime.VOID);
		assert.deepEqual(ret, ['1 - 2!\n', '2 - 3!\n', '3 - 4!\n', '4 - 5!\n']);
	});





/******************************
 *** Vector Primitive Tests ***
 ******************************/


runTest('vector?',
	function() {
		testPrim('vector?', id, [1], false);
		testPrim('vector?', runtime.list, [[1, 2, 3]], false);
		testPrim('vector?', runtime.vector, [[1, 2, 3]], true);
	});


runTest('make-vector',
	function() {
		testPrim('make-vector', id, [0, runtime.char('a')], runtime.vector([]));
		testPrim('make-vector', id, [3, 5], runtime.vector([5, 5, 5]));
	});


runTest('vector',
	function() {
		testPrim('vector', id, [1, 2, 3, 4], runtime.vector([1, 2, 3, 4]));
		testPrim('vector', id, [], runtime.vector([]));
	});


runTest('vector-length',
	function() {
		testPrim('vector-length', runtime.vector, [[]], 0);
		testPrim('vector-length', runtime.vector, [[1, 2, 3]], 3);
	});


runTest('vector-ref',
	function() {
		testPrim('vector-ref', id, [runtime.vector([1, 2]), 1], 2);
		testPrim('vector-ref', id, [runtime.vector([3, 2, 1]), 0], 3);
	});


runTest('vector-set!',
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


runTest('vector->list',
	function() {
		testPrim('vector->list', runtime.vector, [[]], runtime.EMPTY);
		testPrim('vector->list', runtime.vector, [[1, 2, 3]], runtime.list([1, 2, 3]));
	});



/****************************
 *** Char Primitive Tests ***
 ****************************/




runTest('char?',
	function() {
		testPrim('char?', id, [runtime.symbol('hello!')], false);
		testPrim('char?', runtime.string, ['string'], false);
		testPrim('char?', runtime.char, ['w'], true);
	});


runTest('char=?',
	function() {
		testPrim('char=?', runtime.char, ['a', 's', 'D'], false);
		testPrim('char=?', runtime.char, ['f', 'F'], false);
		testPrim('char=?', runtime.char, ['a', 'a', 'a'], true);
		testPrim('char=?', runtime.char, ['1', '1', '2'], false);
	});

runTest('char-ci=?',
	function() {
		testPrim('char-ci=?', runtime.char, ['a', 's', 'D'], false);
		testPrim('char-ci=?', runtime.char, ['f', 'F'], true);
		testPrim('char-ci=?', runtime.char, ['a', 'a', 'a'], true);
		testPrim('char-ci=?', runtime.char, ['1', '1', '2'], false);
	});

runTest('char<?',
	function() {
		testPrim('char<?', runtime.char, ['A', 'a'], true);
		testPrim('char<?', runtime.char, ['a', 'b'], true);
		testPrim('char<?', runtime.char, ['b', 'a'], false);
		testPrim('char<?', runtime.char, ['a', 'd', 'c'], false);
		testPrim('char<?', runtime.char, ['a', 'b', 'b', 'd'], false);
		testPrim('char<?', runtime.char, ['a', 'b', 'c', 'd', 'e'], true);
	});

runTest('char>?',
	function() {
		testPrim('char>?', runtime.char, ['A', 'a'], false);
		testPrim('char>?', runtime.char, ['a', 'b'], false);
		testPrim('char>?', runtime.char, ['b', 'a'], true);
		testPrim('char>?', runtime.char, ['f', 'd', 'e'], false);
		testPrim('char>?', runtime.char, ['e', 'd', 'c', 'c', 'a'], false);
		testPrim('char>?', runtime.char, ['e', 'd', 'c', 'b', 'a'], true);
	});

runTest('char<=?',
	function() {
		testPrim('char<=?', runtime.char, ['A', 'a'], true);
		testPrim('char<=?', runtime.char, ['a', 'b'], true);
		testPrim('char<=?', runtime.char, ['b', 'a'], false);
		testPrim('char<=?', runtime.char, ['a', 'd', 'c'], false);
		testPrim('char<=?', runtime.char, ['a', 'b', 'b', 'd'], true);
		testPrim('char<=?', runtime.char, ['a', 'b', 'c', 'd', 'e'], true);
	});

runTest('char>=?',
	function() {
		testPrim('char>=?', runtime.char, ['A', 'a'], false);
		testPrim('char>=?', runtime.char, ['a', 'b'], false);
		testPrim('char>=?', runtime.char, ['b', 'a'], true);
		testPrim('char>=?', runtime.char, ['f', 'd', 'e'], false);
		testPrim('char>=?', runtime.char, ['e', 'd', 'c', 'c', 'a'], true);
		testPrim('char>=?', runtime.char, ['e', 'd', 'c', 'b', 'a'], true);
	});

runTest('char-ci<?',
	function() {
		testPrim('char-ci<?', runtime.char, ['A', 'a'], false);
		testPrim('char-ci<?', runtime.char, ['a', 'b'], true);
		testPrim('char-ci<?', runtime.char, ['b', 'A'], false);
		testPrim('char-ci<?', runtime.char, ['a', 'd', 'c'], false);
		testPrim('char-ci<?', runtime.char, ['a', 'b', 'b', 'd'], false);
		testPrim('char-ci<?', runtime.char, ['a', 'B', 'c', 'd', 'e'], true);
	});

runTest('char-ci>?',
	function() {
		testPrim('char-ci>?', runtime.char, ['a', 'A'], false);
		testPrim('char-ci>?', runtime.char, ['a', 'b'], false);
		testPrim('char-ci>?', runtime.char, ['b', 'A'], true);
		testPrim('char-ci>?', runtime.char, ['f', 'd', 'e'], false);
		testPrim('char-ci>?', runtime.char, ['e', 'd', 'c', 'c', 'a'], false);
		testPrim('char-ci>?', runtime.char, ['e', 'd', 'C', 'b', 'a'], true);
	});

runTest('char-ci<=?',
	function() {
		testPrim('char-ci<=?', runtime.char, ['a', 'A'], true);
		testPrim('char-ci<=?', runtime.char, ['a', 'B'], true);
		testPrim('char-ci<=?', runtime.char, ['b', 'a'], false);
		testPrim('char-ci<=?', runtime.char, ['a', 'd', 'c'], false);
		testPrim('char-ci<=?', runtime.char, ['a', 'b', 'B', 'd'], true);
		testPrim('char-ci<=?', runtime.char, ['a', 'b', 'C', 'd', 'e'], true);
	});

runTest('char-ci>=?',
	function() {
		testPrim('char-ci>=?', runtime.char, ['A', 'a'], true);
		testPrim('char-ci>=?', runtime.char, ['a', 'b'], false);
		testPrim('char-ci>=?', runtime.char, ['B', 'a'], true);
		testPrim('char-ci>=?', runtime.char, ['f', 'd', 'e'], false);
		testPrim('char-ci>=?', runtime.char, ['e', 'd', 'C', 'c', 'a'], true);
		testPrim('char-ci>=?', runtime.char, ['e', 'd', 'c', 'B', 'a'], true);
	});


runTest('char-alphabetic?',
	function() {
		testPrim('char-alphabetic?', runtime.char, ['a'], true);
		testPrim('char-alphabetic?', runtime.char, ['Z'], true);
		testPrim('char-alphabetic?', runtime.char, ['3'], false);
		testPrim('char-alphabetic?', runtime.char, [' '], false);
		testPrim('char-alphabetic?', runtime.char, ['!'], false);
		testPrim('char-alphabetic?', runtime.char, ['\n'], false);
	});


runTest('char-numeric?',
	function() {
		testPrim('char-numeric?', runtime.char, ['a'], false);
		testPrim('char-numeric?', runtime.char, ['Z'], false);
		testPrim('char-numeric?', runtime.char, ['3'], true);
		testPrim('char-numeric?', runtime.char, [' '], false);
		testPrim('char-numeric?', runtime.char, ['!'], false);
		testPrim('char-numeric?', runtime.char, ['\n'], false);
	});


runTest('char-whitespace?',
	function() {
		testPrim('char-whitespace?', runtime.char, ['a'], false);
		testPrim('char-whitespace?', runtime.char, ['Z'], false);
		testPrim('char-whitespace?', runtime.char, ['3'], false);
		testPrim('char-whitespace?', runtime.char, [' '], true);
		testPrim('char-whitespace?', runtime.char, ['!'], false);
		testPrim('char-whitespace?', runtime.char, ['\n'], true);
		testPrim('char-whitespace?', runtime.char, ['\t'], true);
	});


runTest('char-upper-case?',
	function() {
		testPrim('char-upper-case?', runtime.char, ['a'], false);
		testPrim('char-upper-case?', runtime.char, ['Z'], true);
		testPrim('char-upper-case?', runtime.char, ['3'], false);
		testPrim('char-upper-case?', runtime.char, [' '], false);
		testPrim('char-upper-case?', runtime.char, ['!'], false);
		testPrim('char-upper-case?', runtime.char, ['\n'], false);
	});


runTest('char-lower-case?',
	function() {
		testPrim('char-lower-case?', runtime.char, ['a'], true);
		testPrim('char-lower-case?', runtime.char, ['Z'], false);
		testPrim('char-lower-case?', runtime.char, ['3'], false);
		testPrim('char-lower-case?', runtime.char, [' '], false);
		testPrim('char-lower-case?', runtime.char, ['!'], false);
		testPrim('char-lower-case?', runtime.char, ['\n'], false);
	});


runTest('char->integer',
	function() {
		testPrim('char->integer', runtime.char, ['0'], 48);
		testPrim('char->integer', runtime.char, ['\n'], 10);
	});


runTest('integer->char',
	function() {
		testPrim('integer->char', id, [48], runtime.char('0'));
		testPrim('integer->char', id, [65], runtime.char('A'));
	});


runTest('char-upcase',
	function() {
		testPrim('char-upcase', runtime.char, ['a'], runtime.char('A'));
		testPrim('char-upcase', runtime.char, ['B'], runtime.char('B'));
		testPrim('char-upcase', runtime.char, ['2'], runtime.char('2'));
		testPrim('char-upcase', runtime.char, ['~'], runtime.char('~'));
	});


runTest('char-downcase',
	function() {
		testPrim('char-downcase', runtime.char, ['a'], runtime.char('a'));
		testPrim('char-downcase', runtime.char, ['B'], runtime.char('b'));
		testPrim('char-downcase', runtime.char, ['2'], runtime.char('2'));
		testPrim('char-downcase', runtime.char, ['~'], runtime.char('~'));
	});


runTest('char print formatting',
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


runTest('values',
	function() {
		testPrim('values', id, [], new runtime.ValuesWrapper([]));
		testPrim('values', id, [1, 2, 3, 4], new runtime.ValuesWrapper([1, 2, 3, 4]));
		testPrim('values', id, [1], 1);
	});

runTest('call-with-values',
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


runTest('not',
	function() {
		testPrim('not', id, [false], true);
		testPrim('not', id, [0], false);
		testPrim('not', id, [1], false);
		testPrim('not', runtime.char, ['0'], false);
	});


runTest('boolean?',
	function() {
		testPrim('boolean?', id, [false], true);
		testPrim('boolean?', id, [true], true);
		testPrim('boolean?', runtime.string, ['false'], false);
		testPrim('boolean?', id, [0], false);
		testPrim('boolean?', id, [1], false);
	});


runTest('eq?',
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


runTest('eqv?',
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


runTest('equal?',
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


runTest('equal~?',
	function() {
		testPrim('equal~?', id, [runtime.string('h'), runtime.string('h'), 5], true);
		testPrim('equal~?', id, [5, 4, 0], false);
		testPrim('equal~?', id, [runtime.char('a'), runtime.char('b'), 3], false);
		testPrim('equal~?', id, [5, 3, 3], true);
		testPrim('equal~?', runtime.float, [5.4, 4.9, 0.5], true);
	});


runTest('struct?',
	function() {
		testPrim('struct?', runtime.string, ['a'], false);
		testPrim('struct?', id, [1], false);
		testPrim('struct?', id, [runtime.EMPTY], false);
		testPrim('struct?', runtime.box, [2], false);
		testPrim('struct?', id, [runtime.posn(2, 4)], true);
	});


runTest('procedure-arity',
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


runTest('identity',
	function() {
		testPrim('identity', id, [5], 5);
		testPrim('identity', runtime.string, ['hello'], runtime.string('hello'));
	});


runTest('make-posn',
	function() {
		testPrim('make-posn', id, [4, 5], runtime.posn(4, 5));
		testPrim('make-posn', runtime.char, ['a', 'B'], runtime.posn(runtime.char('a'), runtime.char('B')));
	});

runTest('posn?',
	function() {
		testPrim('posn?', id, [4], false);
		testPrim('posn?', runtime.box, [4], false);
		testPrim('posn?', id, [runtime.posn(5, 4)], true);
	});

runTest('posn-x',
	function() {
		testPrim('posn-x', id, [runtime.posn(5, 4)], 5);
		testPrim('posn-x', id, [runtime.posn(runtime.char('a'), runtime.char('b'))], runtime.char('a'));
	});

runTest('posn-y',
	function() {	
		testPrim('posn-y', id, [runtime.posn(5, 4)], 4);
		testPrim('posn-y', id, [runtime.posn(runtime.char('a'), runtime.char('b'))], runtime.char('b'));
	});


runTest('structure equality',
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
runTest('get-js-object',
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


runTest('js-call',
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
		





runTest("topsyntax",
	function() {
	    sys.print("!Not implemented yet!  ");
	});












/**
This next test is special and should be last.  It'll run an infinite loop, and
schedule a break.

Only after the interpreter breaks do we print "END TESTS".
*/
runTest("closure application, testing break",
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
			  function(err) {
			      assert.ok(types.isSchemeError(err));
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
