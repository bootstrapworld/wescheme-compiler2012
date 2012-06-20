#lang scheme/base
;; A small wrapper around Jay's batch compiler


(require scheme/pretty
         scheme/contract
         compiler/cm
         compiler/decompile
         compiler/zo-marshal
         "../externals/compiler/batch/util.ss"
         "../externals/compiler/batch/nodep.ss"
         "../externals/compiler/batch/merge.ss"
         "../externals/compiler/batch/gc-toplevels.ss"
         "../externals/compiler/batch/alpha.ss"
         "../externals/compiler/batch/module.ss")

(provide/contract 
 [batch-compile (path-string? . -> . path?)]
 [unbatched-compile (path-string? . -> . path?)])


(define (unbatched-compile file)
  (define-values (base name dir?) (split-path file))
  (when (or (eq? base #f) dir?)
    (error 'batch "Cannot run on directory"))
    
  (parameterize ([current-namespace (make-base-empty-namespace)])
    (managed-compile-zo file))
  (build-compiled-path base (path-add-suffix name #".zo")))



(define (batch-compile file-to-batch)
  (define-values (base name dir?) (split-path file-to-batch))
  (when (or (eq? base #f) dir?)
    (error 'batch "Cannot run on directory"))
  
  
  (parameterize ([current-namespace (make-base-empty-namespace)])
    ;; Compile 
    (managed-compile-zo file-to-batch)
    (let ([compiled-zo-path (build-compiled-path base (path-add-suffix name #".zo"))])
      
      (let*-values ([(merged-source-path)
                     (path-add-suffix file-to-batch #".merged.ss")]
                    [(merged-source-base merged-source-name _1)
                     (split-path merged-source-path)]
                    [(merged-zo-path)
                     (build-compiled-path merged-source-base 
                                          (path-add-suffix merged-source-name #".zo"))])
        ;; Transformations
        (eprintf "Removing dependencies~n")
        (let-values ([(batch-nodep top-lang-info top-self-modidx)
                      (nodep-file file-to-batch)])
          
          (eprintf "Merging modules~n")
          (let ([batch-merge
                 (merge-compilation-top batch-nodep)])
            
            (eprintf "GC-ing top-levels~n")
            (let ([batch-gcd
                   (gc-toplevels batch-merge)])
              
              (eprintf "Alpha-varying top-levels~n")
              (let ([batch-alpha
                     (alpha-vary-ctop batch-gcd)])
                
                (define batch-modname
                  (string->symbol (regexp-replace #rx"\\.ss$" (path->string merged-source-name) "")))
                (eprintf "Modularizing into ~a~n" batch-modname)
                (let ([batch-mod
                       (wrap-in-kernel-module batch-modname top-lang-info top-self-modidx batch-alpha)])
                  
                  ;; Output
                  (define batch-final batch-mod)
                  
                  #;(eprintf "Writing merged source~n")
                  #;(with-output-to-file
                        merged-source-path
                      (lambda ()
                        (pretty-print (decompile batch-final)))
                      #:exists 'replace)
                  
                  (eprintf "Writing merged zo~n")
                  (void
                   (with-output-to-file 
                       merged-zo-path
                     (lambda ()
                       (write-bytes (zo-marshal batch-final)))
                     #:exists 'replace))
                  
                  merged-zo-path
                  #;(eprintf "Running merged source~n")
                  #;(void (system (format "mzscheme ~a" merged-source-path))))))))))))