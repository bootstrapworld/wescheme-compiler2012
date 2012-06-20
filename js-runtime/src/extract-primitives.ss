#lang scheme/base

(require scheme/match
         scheme/contract
         compiler/zo-parse)



;; Let's write a program to figure out all the primitives used in a compilation-top.

;; The structure of the code follows the type definitions in:
;; http://docs.plt-scheme.org/mzc/decompile.html?q=zo-parse#(def._((lib._compiler/zo-parse..ss)._indirect~3f))

(provide/contract [extract-primitives (compilation-top? . -> . (listof symbol?))])


;; extract-primitives: toplevel -> (listof symbol)
(define (extract-primitives a-top)
  (unique (extract-top a-top)))
  
(define (unique elts)
  (define ht (make-hash))
  (for ([x elts])
    (hash-set! ht x #t))
  (sort (for/list ([key (in-hash-keys ht)])
          key)
        symbol<?))

(define (symbol<? x y)
  (string<? (symbol->string x)
            (symbol->string y)))

(define (extract-top a-top)
  (match a-top
    [(struct compilation-top (max-let-depth prefix code))
     (append (extract-max-let-depth max-let-depth)
             (extract-prefix prefix)
             (extract-code code))]))
  


;; extract-max-let-depth: number -> (listof symbol)
(define (extract-max-let-depth a-let-depth)
  (list))


;; extract-prefix: prefix -> (listof symbol)
(define (extract-prefix a-prefix)
  (match a-prefix
    [(struct prefix (num-lifts toplevels stxs))
     (list)]))


;; extract-code: code -> (listof symbol)
(define (extract-code a-code)
  (match a-code
    [(? form?)
     (extract-form a-code)]
    [(? indirect?)
     (extract-indirect a-code)]
    [else
     ;; literal value
     (list)]))

;; A form is:
(define (extract-form a-form)
  (match a-form
    [(? def-values?)
     (extract-def-values a-form)]
    [(? def-syntaxes?)
     (extract-def-syntaxes a-form)]
    [(? def-for-syntax?)
     (extract-def-for-syntax a-form)]
    [(? req?)
     (extract-req a-form)]
    [(? seq?)
     (extract-seq a-form)]
    [(? splice?)
     (extract-splice a-form)]
    [(? mod?)
     (extract-mod a-form)]
    [(? expr?)
     (extract-expr a-form)]))

(define (extract-mod a-mod)
  (match a-mod
    [(struct mod (name
                  self-modidx
                  prefix
                  provides
                  requires
                  body
                  syntax-body
                  unexported
                  max-let-depth
                  dummy
                  lang-info
                  internal-context))
     (append (extract-prefix prefix)
             (apply append (map (lambda (b)
                                  (match b 
                                    [(? form?)
                                     (extract-form b)]
                                    [(? indirect?)
                                     (extract-indirect b)]
                                    [else
                                     (list)]))
                            body))
             (apply append (map (lambda (b)
                                  (match b
                                    [(? def-syntaxes?)
                                     (extract-def-syntaxes b)]
                                    [(? def-for-syntax?)
                                     (extract-def-for-syntax b)]))
                                syntax-body)))]))

(define (extract-splice a-splice)
  (match a-splice
    [(struct splice (forms))
     (apply append (map (lambda (f)
                          (match f
                            [(? form?)
                             (extract-form f)]
                            [(? indirect?)
                             (extract-indirect f)]
                            [else
                             (list)])))
            forms)]))



(define (extract-req a-req)
  (match a-req 
    [(struct req (reqs dummy))
     (list)]))


(define (extract-def-values a-def-values)
  (match a-def-values
    [(struct def-values (ids rhs))
     (match rhs
       [(? expr?)
        (extract-expr rhs)]
       [(? seq?)
        (extract-seq rhs)]
       [(? indirect?)
        (extract-indirect rhs)]
       [else
        ;; literal value
        (list)])]))


(define (extract-def-syntaxes a-def-syntaxes)
  (match a-def-syntaxes
    [(struct def-syntaxes (ids rhs prefix max-let-depth))
     (append (match rhs
               [(? expr?)
                (extract-expr rhs)]
               [(? seq?)
                (extract-seq rhs)]
               [(? indirect?)
                (extract-indirect rhs)])
             (extract-prefix prefix))]))


(define (extract-def-for-syntax a-def-for-syntax)
  (match a-def-for-syntax
    [(struct def-for-syntax (ids rhs prefix max-let-depth))
     (append (match rhs
               [(? expr?)
                (extract-expr rhs)]
               [(? seq?)
                (extract-seq rhs)]
               [(? indirect?)
                (extract-indirect rhs)]
               [else
                (list)])
             (extract-prefix prefix)
             (extract-max-let-depth max-let-depth))]))



(define (extract-provided a-provided)
  (match a-provided
    [(struct provided (name src src-name nom-mod src-phase protected? insp))
     (list)]))


(define (extract-expr an-expr)
  (match an-expr
    [(? lam?)
     (extract-lam an-expr)]
    [(? closure?)
     (extract-closure an-expr)]
    [(? indirect?)
     (extract-indirect an-expr)]
    [(? case-lam?)
     (extract-case-lam an-expr)]
    [(? let-one?)
     (extract-let-one an-expr)]
    [(? let-void?)
     (extract-let-void an-expr)]
    [(? install-value?)
     (extract-install-value an-expr)]
    [(? let-rec?)
     (extract-let-rec an-expr)]
    [(? boxenv?)
     (extract-boxenv an-expr)]
    [(struct localref (unbox? pos clear? other-clears? flonum?))
     (extract-localref an-expr)]
    [(? toplevel?)
     (extract-toplevel an-expr)]
    [(? topsyntax?)
     (extract-topsyntax an-expr)]
    [(? application?)
     (extract-application an-expr)]
    [(? branch?)
     (extract-branch an-expr)]
    [(? with-cont-mark?)
     (extract-with-cont-mark an-expr)]
    [(? beg0?)
     (extract-beg0 an-expr)]
    [(? varref?)
     (extract-varref an-expr)]
    [(? assign?)
     (extract-assign an-expr)]
    [(? apply-values?)
     (extract-apply-values an-expr)]
    [(? primval?)
     (extract-primval an-expr)]))
       
(define (extract-case-lam a-case-lam)
  (match a-case-lam
    [(struct case-lam (name clauses))
     (apply append (map extract-lam clauses))]))

(define (extract-install-value an-install-value)
  (match an-install-value
    [(struct install-value (count pos boxes? rhs body))
     (append (match rhs
               [(? expr?)
                (extract-expr rhs)]
               [(? seq?)
                (extract-seq rhs)]
               [(? indirect?)
                (extract-indirect rhs)]
               [else
                (list)])
             (match body
               [(? expr?)
                (extract-expr body)]
               [(? seq?)
                (extract-seq body)]
               [(? indirect?)
                (extract-indirect body)]
               [else
                (list)]))]))

(define (extract-let-rec a-let-rec)
  (match a-let-rec
    [(struct let-rec (procs body))
     (append (apply append (map extract-lam procs))
             (match body
               [(? expr?)
                (extract-expr body)]
               [(? seq?)
                (extract-seq body)]
               [(? indirect?)
                (extract-indirect body)]
               [else
                (list)]))]))

(define (extract-let-void a-let-void)
  (match a-let-void
    [(struct let-void (count boxes? body))
     (match body
       [(? expr?)
        (extract-expr body)]
       [(? seq?)
        (extract-seq body)]
       [(? indirect?)
        (extract-indirect body)]
       [else
        (list)])]))

(define (extract-let-one a-let-one)
  (match a-let-one
    [(struct let-one (rhs body flonum?))
     (append (match rhs
               [(? expr?)
                (extract-expr rhs)]
               [(? seq?)
                (extract-seq rhs)]
               [(? indirect?)
                (extract-indirect rhs)]
               [else
                (list)])
             (match body
               [(? expr?)
                (extract-expr body)]
               [(? seq?)
                (extract-seq body)]
               [(? indirect?)
                (extract-indirect body)]
               [else
                (list)]))]))
        
             
(define (extract-boxenv a-boxenv)
  (match a-boxenv
    [(struct boxenv (pos body))
     (match body
       [(? expr?)
        (extract-expr body)]
       [(? seq?)
        (extract-seq body)]
       [(? indirect?)
        (extract-indirect body)]
       [else
        (list)])]))

(define (extract-primval a-primval)
  (match a-primval
    [(struct primval (id))
     (list (hash-ref primitive-table id))
     ;; fixme: should correlate the integer using the primitive map.
     #;(list id)]))

(define (extract-localref a-localref)
  (match a-localref
    [(struct localref (unbox? pos clear? other-clears? flonum?))
     (list)]))


(define (extract-toplevel a-toplevel)
  (match a-toplevel
    [(struct toplevel (depth pos const? ready?))
     (list)]))


(define (extract-topsyntax a-topsyntax)
  (match a-topsyntax
    [(struct topsyntax (depth pos midpt))
     (list)]))


(define (extract-branch a-branch)
  (match a-branch
    [(struct branch (test then else))
     (append (match test
             [(? expr?)
                (extract-expr test)]
               [(? seq?)
                (extract-seq test)]
               [(? indirect?)
                (extract-indirect test)]
               [else
                (list)])
           (match then
             [(? expr?)
                (extract-expr then)]
               [(? seq?)
                (extract-seq then)]
               [(? indirect?)
                (extract-indirect then)]
               [else
                (list)])
           (match else
             [(? expr?)
                (extract-expr else)]
               [(? seq?)
                (extract-seq else)]
               [(? indirect?)
                (extract-indirect else)]
               [else
                (list)]))]))
             

(define (extract-application an-application)
  (match an-application
    [(struct application (rator rands))
     (append (match rator
               [(? expr?)
                (extract-expr rator)]
               [(? seq?)
                (extract-seq rator)]
               [(? indirect?)
                (extract-indirect rator)]
               [else
                (list)])
             (apply append (map (lambda (r)
                                  (match r
                                    [(? expr?)
                                     (extract-expr r)]
                                    [(? seq?)
                                     (extract-seq r)]
                                    [(? indirect?)
                                     (extract-indirect r)]
                                    [else
                                     (list)]))
                                rands)))]))
     

(define (extract-apply-values an-apply-values)
  (match an-apply-values
    [(struct apply-values (proc args-expr))
     (append (match proc
               [(? expr?)
                (extract-expr proc)]
               [(? seq?)
                (extract-seq proc)]
               [(? indirect?)
                (extract-indirect proc)]
               [else
                (list)])
             (match args-expr
               [(? expr?)
                (extract-expr args-expr)]
               [(? seq?)
                (extract-seq args-expr)]
               [(? indirect?)
                (extract-indirect args-expr)]
               [else
                (list)]))]))

(define (extract-with-cont-mark a-with-cont-mark)
  (match a-with-cont-mark
    [(struct with-cont-mark (key val body))
     (append (match key
               [(? expr?)
                (extract-expr key)]
               [(? seq?)
                (extract-seq key)]
               [(? indirect?)
                (extract-indirect key)]
               [else
                (list)])
             (match val
               [(? expr?)
                (extract-expr val)]
               [(? seq?)
                (extract-seq val)]
               [(? indirect?)
                (extract-indirect val)]
               [else
                (list)])
             (match body
               [(? expr?)
                (extract-expr body)]
               [(? seq?)
                (extract-seq body)]
               [(? indirect?)
                (extract-indirect body)]
               [else
                (list)]))]))


(define (extract-beg0 a-big0)
  (match a-big0
    [(struct beg0 (seq))
     (apply append (map (lambda (s)
                         (match s
                           [(? expr?)
                            (extract-expr s)]
                           [(? seq?)
                            (extract-seq s)]
                           [(? indirect?)
                            (extract-indirect s)]
                           [else
                            (list)]))
                        seq))]))

(define (extract-assign an-assign)
  (match an-assign
    [(struct assign (id rhs undef-ok))
     (match rhs
       [(? expr?)
        (extract-expr rhs)]
       [(? seq?)
        (extract-seq rhs)]
       [(? indirect?)
        (extract-indirect rhs)]
       [else
        (list)])]))
        

(define (extract-varref a-varref)
  (match a-varref
    [(struct varref (toplevel))
     (extract-toplevel toplevel)]))

             


(define (extract-lam a-lam)
  (match a-lam
    [(struct lam (name flags num-params param-types 
                       rest? closure-map closure-types 
                       max-let-depth body))
     (match body
       [(? expr?)
        (extract-expr body)]
       [(? seq?)
        (extract-seq body)]
       [(? indirect?)
        (extract-indirect body)]
       [else
        ;; it's a literal datum
        (list)])]))


(define (extract-seq a-seq)
  (match a-seq
    [(struct seq (forms))
     (apply append
            (map (lambda (f)
                   (match f
                     [(? form?)
                      (extract-form f)]
                     [(? indirect?)
                      (extract-indirect f)]
                     [else
                      ;; it's a literal datum
                      (list)]))
                 forms))]))

     

(define visit-ht (make-hasheq))
;; avoid loops!
(define (extract-indirect an-indirect)
  (match an-indirect
    [(struct indirect (v))
     (cond [(hash-ref visit-ht v #f)
            (hash-set! visit-ht v #t)
            (extract-closure v)]
           [else
            (list)])]))


(define (extract-closure a-closure)
  (match a-closure 
    [(struct closure (lam gen-id))
     (extract-lam lam)]))




;; Code is copied-and-pasted from compiler/decompile.
(define primitive-table
  ;; Figure out number-to-id mapping for kernel functions in `primitive'
  (let ([bindings
         (let ([ns (make-base-empty-namespace)])
           (parameterize ([current-namespace ns])
             (namespace-require ''#%kernel)
             (namespace-require ''#%unsafe)
             (namespace-require ''#%flfxnum)
             (for/list ([l (namespace-mapped-symbols)])
               (cons l (with-handlers ([exn:fail? (lambda (x) 
                                                    #f)])
                         (compile l))))))]
        [table (make-hash)])
    (for ([b (in-list bindings)])
      (let ([v (and (cdr b)
                    (zo-parse (let ([out (open-output-bytes)])
                                (write (cdr b) out)
                                (close-output-port out)
                                (open-input-bytes (get-output-bytes out)))))])
        (let ([n (match v
                   [(struct compilation-top (_ prefix (struct primval (n)))) n]
                   [else #f])])
          (hash-set! table n (car b)))))
    table))




(define (test)
  (define flight-lander-parsing
    (zo-parse (open-input-file "../sandbox/flight-lander/flight-lander_ss_merged_ss.zo")))
  (extract-primitives flight-lander-parsing))
