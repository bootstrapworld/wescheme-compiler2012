#lang scheme/base
(require "bytecode-compiler.ss"
         "sexp.ss"
         "batch-wrap.ss"
         "bytecode-structs.ss"
         "translate-bytecode-structs.ss"
         (prefix-in internal: compiler/zo-parse)
         scheme/file
         scheme/path
         scheme/cmdline
         scheme/runtime-path)

(define-runtime-path lib-directory "../lib")

;; make-output-file-path: path -> path
;; Given the normalized name of the Scheme program, produce a normalized path
;; of the output javascript program.
(define (make-output-file-path a-file-path)
  (let-values ([(base file dir?)
                (split-path a-file-path)])
    (build-path base
                (regexp-replace #px"\\.\\w+$" 
                                (path->string (file-name-from-path file))
                                ".js"))))


;; copy-lib-files: path -> void
;; copy the files in lib to the directory.
(define (copy-lib-files a-dir)
  (when (directory-exists? (build-path a-dir "lib"))
    (delete-directory/files (build-path a-dir "lib")))
  (copy-directory/files lib-directory (build-path a-dir "lib")))
        
               

;; mzjs: path -> void
;; Given the path of a scheme program, run it through the batch compiler
;; and generate the javascript program.
(define (mzjs a-path)
  ;; Run the batch compiler over the path
  (let*-values ([(a-path) (normalize-path a-path)]
                [(compiled-zo-path) (batch-compile a-path)]
                [(base-dir file dir?) (split-path a-path)])
    (copy-lib-files base-dir)
    (call-with-input-file compiled-zo-path
      (lambda (ip)
        (call-with-output-file (make-output-file-path a-path)
          (lambda (op)
            (fprintf op "var _runtime = require('./lib');")
            (fprintf op "var program = _runtime.load(~a);" 
                     (jsexp->js (compile-top (translate-compilation-top (internal:zo-parse ip)))))
            (fprintf op "_runtime.run(program);"))
          #:exists 'replace)))))


(mzjs (command-line #:program "mzjs" 
              #:args (filename)
              filename))
