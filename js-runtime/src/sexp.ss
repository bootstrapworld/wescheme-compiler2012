#lang racket/base
(require racket/string
         racket/list
         racket/contract
         racket/match
         "jsexp.ss")

(provide/contract [jsexp->js (jsexp? . -> . string?)]
                  [sexp->js (any/c . -> . string?)])


(define LIST-CONSTRUCTOR "types.list")
(define PAIR-CONSTRUCTOR "types.pair")
(define VECTOR-CONSTRUCTOR "types.vector")
(define SYMBOL-CONSTRUCTOR "types.symbol")
(define KEYWORD-CONSTRUCTOR "types.keyword")
(define FLOAT-CONSTRUCTOR "types['float']")
(define RATIONAL-CONSTRUCTOR "types.rational")
(define BIGNUM-CONSTRUCTOR "types.bignum")
(define COMPLEX-CONSTRUCTOR "types.complex")
(define CHARACTER-CONSTRUCTOR "types['char']")
(define PATH-CONSTRUCTOR "types.path")
(define BOX-CONSTRUCTOR "types.box")
(define REGEXP-CONSTRUCTOR "types.regexp")
(define BYTE-REGEXP-CONSTRUCTOR "types.byteRegexp")
(define BYTES-CONSTRUCTOR "types.bytes")


(define EMPTY "types.EMPTY")
(define TRUE "true")
(define FALSE "false")
(define VOID "types.VOID")


;; -jsexp->js: jsexp -> string
(define (jsexp->js a-jsexp)
  (define op (open-output-string))
  (jsexp->js/port a-jsexp op)
  (get-output-string op))


;; jsexp->js/port: jsexp -> void
(define (jsexp->js/port a-jsexp op)
  (match a-jsexp
    [(struct cmt (message rest))
     (display "/* " op)
     (display message op)
     (display " */\n" op)
     (jsexp->js/port rest op)]
    [(struct ht (name pairs))
     (display "{" op)
     (port-for-each/comma-separate key-value->js
                                   (cons `($ ,(make-lit (symbol->string name)))
                                         pairs)
                                   op)
     (display "}" op)]
    [(struct vec (items))
     (display "[" op)
     (port-for-each/comma-separate jsexp->js/port items op)
     (display "]" op)]
    [(struct int (v))
     (display (number->string v) op)]
    [(struct lit (v))
     (sexp->js/port v op)]))
  

;; key-value->js: (list symbol jsval) port -> void
(define (key-value->js a-key-value op)
  (let ([key (first a-key-value)]
        [value (second a-key-value)])
    (sexp->js/port (symbol->string key) op)
    (display ":" op)
    (jsexp->js/port value op)))


;; apply a for-each across a list of elements, printing the separator into the
;; port between each element.
(define (port-for-each/comma-separate f elts op)
  (cond [(empty? elts)
         (void)]
        [else
         (let loop ([elts elts])
           (cond
            [(empty? (rest elts))
             (f (first elts) op)]
            [else
             (f (first elts) op)
             (display "," op)
             (loop (rest elts))]))]))


;; sexp->js: any -> string
(define (sexp->js expr)
  (define op (open-output-string))
  (sexp->js/port expr op)
  (get-output-string op))
  

(define (sexp->js/port expr op)
  (cond
    [(void? expr)
     (display VOID op)]
    
    ;; Empty
    [(empty? expr)
     (display EMPTY op)]
    
    ;; Nonempty lists
    [(list? expr)
     (display LIST-CONSTRUCTOR op)
     (display "([" op)
     (port-for-each/comma-separate sexp->js/port expr op)
     (display "])" op)]

    ;; Dotted pairs
    [(pair? expr)
     (display PAIR-CONSTRUCTOR op)
     (display "(" op)
     (sexp->js/port (car expr) op)
     (display "," op)
     (sexp->js/port (cdr expr) op)
     (display ")" op)]
    
    ;; Vectors
    [(vector? expr)
     (display VECTOR-CONSTRUCTOR op)
     (display "([" op)
     (port-for-each/comma-separate sexp->js/port (vector->list expr) op)
     (display "])" op)]
    
    ;; Symbols
    [(symbol? expr)
     (display SYMBOL-CONSTRUCTOR op)
     (display "(" op)
     (display (string->js (symbol->string expr)) op)
     (display ")" op)]

    ;; Keywords
    [(keyword? expr)
     (display KEYWORD-CONSTRUCTOR op)
     (display "(" op)
     (display (string->js (symbol->string expr)) op)
     (display ")" op)]
    
    ;; Numbers
    [(number? expr)
     (display (number->js expr) op)]
   
    ;; Strings
    [(string? expr)
     (display (string->js expr) op)]
    
    ;; Bytes
    [(bytes? expr)
     (display BYTES-CONSTRUCTOR op)
     (display "([" op)
     (port-for-each/comma-separate display 
                    (map number->string (bytes->list expr))
                    op)
     (display "])" op)]

    ;; Characters
    [(char? expr)
     (display (character->js expr) op)]
    
    ;; Booleans
    [(boolean? expr)
     (display (boolean->js expr) op)]
 
    ;; Paths
    [(path? expr)
     (display PATH-CONSTRUCTOR  op)
     (display "(" op)
     (display (string->js (path->string expr)) op)
     (display ")")]

    ;; Boxes
    [(box? expr)
     (display BOX-CONSTRUCTOR  op)
     (display "(" op)
     (sexp->js/port (unbox expr) op)
     (display ")" op)]
    
    ;; Regexps
    [(regexp? expr)
     (display REGEXP-CONSTRUCTOR op)
     (display "(" op)
     (sexp->js/port (object-name expr) op)
     (display ")" op)]

    ;; Byte regexps
    [(byte-regexp? expr)
     (display BYTE-REGEXP-CONSTRUCTOR op)
     (display "(" op)
     (sexp->js/port (object-name expr) op)
     (display ")" op)]

    [else
     (error 'sexp->js/port (format "Can't translate ~s" expr))]))




;; boolean->js: boolean -> string
(define (boolean->js a-bool)
  (cond
    [a-bool TRUE]
    [else FALSE]))



;; floating-number->js: number -> string
(define (floating-number->js a-num)
  (string-append FLOAT-CONSTRUCTOR"("
                 (cond
                   [(eqv? a-num +inf.0)
                    "Number.POSITIVE_INFINITY"]
                   [(eqv? a-num -inf.0)
                    "Number.NEGATIVE_INFINITY"]
                   [(eqv? a-num +nan.0)
                    "Number.NaN"]
                   [else
                    (number->string a-num)])
                 ")"))

;; rational-number->js: number -> string
(define (rational-number->js a-num)
  (cond [(= (denominator a-num) 1)
         (string-append (integer->js (numerator a-num)))]
        [else
         (string-append RATIONAL-CONSTRUCTOR "("
                        (integer->js (numerator a-num))
                        ", "
                        (integer->js (denominator a-num))
                        ")")]))

;; integer->js: int -> string
(define (integer->js an-int)
  (cond
    ;; non-overflow case
    [(< (abs an-int) 9e15)
     (number->string an-int)]
    ;; overflow case
    [else
     (string-append BIGNUM-CONSTRUCTOR 
                    "("
                    (string->js (number->string an-int))
                    ")")]))


;; number->java-string: number -> string
(define (number->js a-num)
  (cond 
    [(and (exact? a-num) (rational? a-num))
     (rational-number->js a-num)]
    
    [(real? a-num)
     (floating-number->js a-num)]
    
    [(complex? a-num)
     (string-append COMPLEX-CONSTRUCTOR "("
                    (number->js (real-part a-num))
                    ", "
                    (number->js (imag-part a-num))
                    ")")]))



;; char->javascript-string: char -> string
(define (character->js a-char)
  (string-append CHARACTER-CONSTRUCTOR "("
                 "String.fromCharCode("
                 (number->string (char->integer a-char))
                 "))"))


;; excape-char-code: char -> string
(define (escape-char-code a-char)
  (case (char->integer a-char)
    [(0) "\\0"]
    [(7) "\\a"]
    [(8) "\\b"]
    [(9) "\\t"]
    [(10) "\\n"]
    [(11) "\\v"]
    [(12) "\\f"]
    [(13) "\\r"]
    [(32) " "]
    [(34) "\\\""]
    [(92) "\\\\"]
    [else
     (cond
       [(char-graphic? a-char)
        (string a-char)]
       [else
        (string-append "\\u"
                       (pad0 (number->string (char->integer a-char) 16) 
                             4))])]))

;; pad0: string number -> string
;; Adds the padding character #\0 in front of str so that it has the desired length.
(define (pad0 str len)
  (cond [(>= (string-length str) len)
         str]
        [else
         (string-append (build-string (- len (string-length str))(lambda (i) #\0))
                        str)]))


;; string->javascript-string: string -> string
(define (string->js a-str)
  ;; FIXME: escape all character codes!
  (string-append "\""
                 (string-join (map escape-char-code (string->list a-str))
                              "")
                 "\""))