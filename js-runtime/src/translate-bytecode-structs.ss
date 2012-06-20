#lang scheme/base

(require "bytecode-structs.ss"
         scheme/match
         (prefix-in internal: compiler/zo-structs))

;; Translation from mzscheme 4.2.5 bytecode structures to our own.

(define current-indirect-map (make-parameter (make-hasheq)))


(define (translate-compilation-top a-top)
  (parameterize ([current-indirect-map (make-hasheq)])
    (match a-top
      [(struct internal:compilation-top (max-let-depth prefix code))
       (make-compilation-top max-let-depth (translate-prefix prefix) (translate-code code))])))
  

(define (translate-code a-code)
  (match a-code
    [(? internal:form?)
     (translate-form a-code)]
    [(? internal:indirect?)
     (translate-indirect a-code)]
    [else
     a-code]))
     

(define (translate-prefix a-prefix)
  (match a-prefix
    [(struct internal:prefix (num-lifts toplevels stxs))
     (make-prefix num-lifts 
                  (map (lambda (x)
                         (match x
                           ['#f
                             #f]
                           [(? symbol?)
                            x]
                           [(? internal:global-bucket?)
                            (translate-global-bucket x)]
                           [(? internal:module-variable?)
                            (translate-module-variable x)]))
                       toplevels)
                  (map translate-stx stxs))]))

(define (translate-stx an-stx)
  (match an-stx
    [(struct internal:stx (encoded))
     (make-stx (translate-wrapped encoded))]))


(define (translate-wrapped a-wrapped)
  (match a-wrapped
    [(struct internal:wrapped (datum wraps certs))
     (make-wrapped datum (map translate-wrap wraps) certs)]))

(define (translate-wrap a-wrap)
  (match a-wrap
    [(? internal:lexical-rename?)
     (translate-lexical-rename a-wrap)]
    [(? internal:phase-shift?)
     (translate-phase-shift a-wrap)]
    [(? internal:module-rename?)
     (translate-module-rename a-wrap)]))

(define (translate-lexical-rename a-lexical-rename)
  (match a-lexical-rename
    [(struct internal:lexical-rename (bool1 bool2 alist))
     (make-lexical-rename bool1 bool2 alist)]))

(define (translate-phase-shift a-phase-shift)
  (match a-phase-shift
    [(struct internal:phase-shift (amt src dest))
     (make-phase-shift amt src dest)]))

(define (translate-module-rename a-module-rename)
  (match a-module-rename
    [(struct internal:module-rename (phase kind set-id unmarshals renames mark-renames plus-kern?))
     (make-module-rename phase kind set-id 
                         (map translate-all-from-module unmarshals)
                         (map translate-module-binding renames)
                         mark-renames
                         plus-kern?)]))

(define (translate-all-from-module an-all-from-module)
  (match an-all-from-module
    [(struct internal:all-from-module (path phase src-phase exceptions prefix))
     (make-all-from-module path phase src-phase exceptions prefix)]))
    

(define (translate-module-binding a-module-binding)
  (match a-module-binding
    [(? internal:simple-module-binding?)
     (translate-simple-module-binding a-module-binding)]
    [(? internal:phased-module-binding?)
     (translate-phased-module-binding a-module-binding)]
    [(? internal:exported-nominal-module-binding?)
     (translate-exported-nominal-module-binding a-module-binding)]
    [(? internal:nominal-module-binding?)
     (translate-nominal-module-binding a-module-binding)]
    [(? internal:exported-module-binding?)
     (translate-exported-module-binding a-module-binding)]))

(define (translate-simple-module-binding a-simple-module-binding)
  (match a-simple-module-binding
    [(struct internal:simple-module-binding (path))
     (make-simple-module-binding path)]))


(define (translate-phased-module-binding a-binding)
  (match a-binding
    [(struct internal:phased-module-binding (path phase export-name nominal-path nominal-export-name))
     (make-phased-module-binding path phase export-name (translate-nominal-path nominal-path) nominal-export-name)]))
     

(define (translate-nominal-module-binding a-binding)
  (match a-binding
    [(struct internal:nominal-module-binding (path nominal-path))
     (make-nominal-module-binding path (translate-nominal-path nominal-path))]))


(define (translate-exported-nominal-module-binding a-module-binding)
  (match a-module-binding
    [(struct internal:exported-nominal-module-binding (path export-name nominal-path nominal-export-name))
     (make-exported-nominal-module-binding path export-name (translate-nominal-path nominal-path) nominal-export-name)]))


(define (translate-exported-module-binding a-module-binding)
  (match a-module-binding
    [(struct internal:exported-module-binding (path export-name))
     (make-exported-module-binding path export-name)]))

(define (translate-module-variable a-module-variable)
  (match a-module-variable
    [(struct internal:module-variable (modidx sym pos phase))
     (make-module-variable modidx sym pos phase)]))

(define (translate-global-bucket a-bucket)
  (match a-bucket
    [(struct internal:global-bucket (name))
     (make-global-bucket name)]))



(define (translate-nominal-path a-nominal-path)
  (match a-nominal-path
    [(? simple-nominal-path?)
     (translate-simple-nominal-path a-nominal-path)]
    [(? imported-nominal-path?)
     (translate-imported-nominal-path a-nominal-path)]
    [(? phased-nominal-path?)
     (translate-phased-nominal-path a-nominal-path)]))


(define (translate-simple-nominal-path a-path)
  (match a-path
    [(struct internal:simple-nominal-path (value))
     (make-simple-nominal-path (value))]))


(define (translate-imported-nominal-path a-path)
  (match a-path
    [(struct internal:imported-nominal-path (value import-phase))
     (make-imported-nominal-path (value import-phase))]))
                                         

(define (translate-phased-nominal-path a-path)
  (match a-path
    [(struct internal:phased-nominal-path (value import-phase phase))
     (make-phased-nominal-path value import-phase phase)]))




(define (translate-indirect an-indirect)
  (match an-indirect
    [(struct internal:indirect (v))
     (cond
       [(hash-ref (current-indirect-map) an-indirect #f)
        (hash-ref (current-indirect-map) an-indirect)]
       [else
        (begin
          ;; Make the shell, and continue the copy.
          (let ([partial-result (make-indirect #f)])
            (hash-set! (current-indirect-map) an-indirect partial-result)
            (let* ([translated-closure (translate-closure v)])
              ;; Fix the shell.
              (set-indirect-v! partial-result translated-closure)
              partial-result)))])]))


(define (translate-form a-form)
  (match a-form
    [(? internal:def-values?)
     (translate-def-values a-form)]
    [(? internal:def-syntaxes?)
     (translate-def-syntaxes a-form)]
    [(? internal:def-for-syntax?)
     (translate-def-for-syntax a-form)]
    [(? internal:req?)
     (translate-req a-form)]
    [(? internal:seq?)
     (translate-seq a-form)]
    [(? internal:splice?)
     (translate-splice a-form)]
    [(? internal:mod?)
     (translate-mod a-form)]
    [(? internal:expr?)
     (translate-expr a-form)]))


(define (translate-req a-req)
  (match a-req
    [(struct internal:req (reqs dummy))
     (make-req reqs (translate-toplevel dummy))]))
      

(define (translate-toplevel a-toplevel)
  (match a-toplevel
    [(struct internal:toplevel (depth pos const? ready?))
     (make-toplevel depth pos const? ready?)]))


(define (translate-at-expression-position x)
  (match x
    [(? internal:expr?)
     (translate-expr x)]
    [(? internal:seq?)
     (translate-seq x)]
    [(? internal:indirect?)
     (translate-indirect x)]
    [else
     x]))


(define (translate-def-values a-def-values)
  (match a-def-values
    [(struct internal:def-values (ids rhs))
     (make-def-values (map translate-toplevel ids)
                      (translate-at-expression-position rhs))]))


(define (translate-def-syntaxes a-def-syntaxes)
  (match a-def-syntaxes
    [(struct internal:def-syntaxes (ids rhs prefix max-let-depth))
     (make-def-syntaxes (map translate-toplevel ids)
                        (translate-at-expression-position rhs)
                        (translate-prefix prefix)
                        max-let-depth)]))

(define (translate-def-for-syntax a-define-for-syntax)
  (match a-define-for-syntax
    [(struct internal:def-for-syntax (ids rhs prefix max-let-depth))
     (make-def-for-syntax (map translate-toplevel ids)
                          (translate-at-expression-position rhs)
                          (translate-prefix prefix)
                          max-let-depth)]))


(define (translate-mod a-mod)
  (match a-mod
    [(struct internal:mod (name
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
     (make-mod name
               self-modidx 
               (translate-prefix prefix)
               (map (lambda (a-provide) 
                      (list (first a-provide)
                            (translate-provided (second a-provide))
                            (translate-provided (third a-provide))))
                    provides)
               requires
               (map translate-at-form-position body)
               (map (lambda (a-body) 
                      (match a-body 
                        [(? internal:def-syntaxes?)
                         (translate-def-syntaxes a-body)]
                        [(? internal:def-for-syntax?)
                         (translate-def-for-syntax a-body)]))
                    syntax-body)
               unexported
               max-let-depth
               (translate-toplevel dummy)
               lang-info
               internal-context)]))
               
(define (translate-provided a-provided)
  (match a-provided
    [(struct internal:provided (name src src-name nom-mod src-phase protected? insp))
     (make-provided name src src-name nom-mod src-phase protected? insp)]))


(define (translate-splice a-splice)
  (match a-splice
    [(struct internal:splice (forms))
     (make-splice (map translate-at-form-position forms))]))
             
(define (translate-seq a-seq)
  (match a-seq
    [(struct internal:seq (forms))
     (make-seq (map translate-at-form-position forms))]))


(define (translate-at-form-position x)
  (match x
    [(? internal:form?)
     (translate-form x)]
    [(? internal:indirect?)
     (translate-indirect x)]
    [else
     x]))


(define (translate-closure a-closure)
  (match a-closure
    [(struct internal:closure (code gen-id))
     (make-closure (translate-lam code) gen-id)]))


(define (translate-expr an-expr)
  (match an-expr
    [(? internal:lam?)
     (translate-lam an-expr)]
    [(? internal:closure?)
     (translate-closure an-expr)]
    [(? internal:indirect?)
     (translate-indirect an-expr)]
    [(? internal:case-lam?)
     (translate-case-lam an-expr)]
    [(? internal:let-one?)
     (translate-let-one an-expr)]
    [(? internal:let-void?)
     (translate-let-void an-expr)]
    [(? internal:install-value?)
     (translate-install-value an-expr)]
    [(? internal:let-rec?)
     (translate-let-rec an-expr)]
    [(? internal:boxenv?)
     (translate-boxenv an-expr)]
    [(? internal:localref?)
     (translate-localref an-expr)]
    [(? internal:toplevel?)
     (translate-toplevel an-expr)]
    [(? internal:topsyntax?)
     (translate-topsyntax an-expr)]
    [(? internal:application?)
     (translate-application an-expr)]
    [(? internal:branch?)
     (translate-branch an-expr)]
    [(? internal:with-cont-mark?)
     (translate-with-cont-mark an-expr)]
    [(? internal:beg0?)
     (translate-beg0 an-expr)]
    [(? internal:varref?)
     (translate-varref an-expr)]
    [(? internal:assign?)
     (translate-assign an-expr)]
    [(? internal:apply-values?)
     (translate-apply-values an-expr)]
    [(? internal:primval?)
     (translate-primval an-expr)]))


(define (translate-lam a-lam)
  (match a-lam
    [(struct internal:lam 
             (name flags num-params param-types rest? closure-map closure-types max-let-depth body))
     (make-lam name flags num-params param-types rest? closure-map closure-types max-let-depth (translate-at-expression-position body))]))
                      

(define (translate-primval a-primval)
  (match a-primval
    [(struct internal:primval (id))
     (make-primval id)]))

(define (translate-apply-values an-apply-values)
  (match an-apply-values
    [(struct internal:apply-values (proc args-expr))
     (make-apply-values (translate-at-expression-position proc)
                        (translate-at-expression-position args-expr))]))

(define (translate-assign an-assign)
  (match an-assign
    [(struct internal:assign (id rhs undef-ok?))
     (make-assign (translate-toplevel id) (translate-at-expression-position rhs) undef-ok?)]))
             

(define (translate-varref a-varref)
  (match a-varref
    [(struct internal:varref (toplevel))
     (make-varref (translate-toplevel toplevel))]))


(define (translate-beg0 a-beg0)
  (match a-beg0
    [(struct internal:beg0 (seq))
     (make-beg0 (map translate-at-expression-position seq))]))

(define (translate-with-cont-mark a-with-cont-mark)
  (match a-with-cont-mark
    [(struct internal:with-cont-mark (key val body))
     (make-with-cont-mark (translate-at-expression-position key)
                          (translate-at-expression-position val)
                          (translate-at-expression-position body))]))

(define (translate-branch a-branch)
  (match a-branch
    [(struct internal:branch (test then else))
     (make-branch (translate-at-expression-position test)
                  (translate-at-expression-position then)
                  (translate-at-expression-position else))]))


(define (translate-application an-application)
  (match an-application
    [(struct internal:application (rator rands))
     (make-application (translate-at-expression-position rator)
                       (map translate-at-expression-position rands))]))


(define (translate-topsyntax a-topsyntax)
  (match a-topsyntax
    [(struct internal:topsyntax (depth pos midp))
     (make-topsyntax depth pos midp)]))
             

(define (translate-localref a-localref)
  (match a-localref
    [(struct internal:localref (unbox? pos clear? other-clears? flonum?))
     (make-localref unbox? pos clear? other-clears? flonum?)]))

(define (translate-boxenv a-boxenv)
  (match a-boxenv
    [(struct internal:boxenv (pos body))
     (make-boxenv pos (translate-at-expression-position body))]))

(define (translate-let-rec a-let-rec)
  (match a-let-rec
    [(struct internal:let-rec (procs body))
     (make-let-rec (map translate-lam procs)
                   (translate-at-expression-position body))]))


(define (translate-install-value an-install-value)
  (match an-install-value
    [(struct internal:install-value (count pos boxes? rhs body))
     (make-install-value count pos boxes? 
                         (translate-at-expression-position rhs)
                         (translate-at-expression-position body))]))

(define (translate-let-void a-let-void)
  (match a-let-void
    [(struct internal:let-void (count boxes? body))
     (make-let-void count boxes? (translate-at-expression-position body))]))


(define (translate-let-one a-let-one)
  (match a-let-one
    [(struct internal:let-one (rhs body flonum?))
     (make-let-one (translate-at-expression-position rhs)
                   (translate-at-expression-position body)
                   flonum?)]))


(define (translate-case-lam a-case-lam)
  (match a-case-lam
    [(struct internal:case-lam (name clauses))
     (make-case-lam name (map translate-lam clauses))]))



(provide/contract [translate-compilation-top (internal:compilation-top? . -> . compilation-top?)])