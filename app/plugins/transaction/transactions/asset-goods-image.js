/**
 * The MIT License (MIT)
 * Copyright (c) 2021 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
// assign small image for asset

(function () {
    'use strict'
    var module = angular.module('fim.base')

    module.run(function (plugins, modals, $q, $rootScope, nxt) {

        var plugin = plugins.get('transaction')

        function createFields(args) {
            var api = nxt.get($rootScope.currentAccount.id_rs)
            var fileContentBase64 = " "
            return {
                title: 'Assign Image',
                message: "Assign small image to " + (args.asset ? 'asset' : '') + (args.goods ? 'marketplace goods' : ''),
                requestType: 'uploadTaggedData',
                feeNXT: '1',
                createArguments: function (items) {
                    var paramType
                    var paramPriority
                    if (items.asset) {
                        paramType = "ASSET"
                        paramPriority = "priority01"
                    } else if (items.goods) {
                        paramType = "GOODS"
                        paramPriority = "priority00"
                    }
                    var paramId = items.asset || items.goods

                    /*
                    for prunable transaction after transaction is signed (in client app)
                    the prunableAttachmentJSON should be sent along with transactionBytes
                    because transactionBytes does not contain prunable data (attachment in fact)
                    */
                    var prunableAttachmentJSON = {
                        "version.TaggedDataUpload": 1,
                        isText: true,
                        description: "",
                        filename: "",
                        channel: "(FTR.3.0)",
                        type: paramType,
                        name: paramId,
                        tags: paramPriority,
                        data: items.imageURL || fileContentBase64
                    }

                    return {
                        isText: true,
                        channel: "(FTR.3.0)",
                        type: paramType,
                        name: paramId,
                        tags: paramPriority,
                        data: items.imageURL || fileContentBase64,
                        prunableAttachmentJSON: prunableAttachmentJSON
                    }
                },
                fields: [
                    plugin.fields('static').create('note1', {
                        hide: false,
                        value: "You can specify only one - image file (approximately less than 35 KB) or image URL"
                    }),
                    plugin.fields('input-file').create('file', {
                        value: '',
                        label: 'Image file (to clean selected file open dialog then click Cancel)',
                        required: false,
                        onchange: function (fields) {
                            updateNote2(fields)
                            var file = this.value[0]
                            fileContentBase64 = null
                            fields.loadedImage.value = ""
                            this.errorMsg = null
                            if (file) {
                                if (file.size > 40000) {
                                    this.errorMsg = "File size is too big"
                                } else {
                                    var self = this
                                    self.errorMsg = "File conversion in the progress..."
                                    encodeImageFileAsURL(file).then(function (content) {
                                        if (content.length > 40000) {
                                            self.errorMsg = "File size is too big"
                                        } else {
                                            self.errorMsg = null
                                            fileContentBase64 = content
                                            fields.loadedImage.value = content
                                        }
                                    }).then(function (v) {
                                        fields.formValid.value = fileContentBase64 && (fields.asset.value || fields.goods.value || '')
                                        fields.imageURL.hide = !!file
                                    }).catch(function (reason) {
                                        console.error(reason)
                                        self.errorMsg = reason.toString()
                                    })
                                }
                            } else {
                                fileContentBase64 = " "  // empty is not allowed so space is indicator of no file
                            }
                            fields.formValid.value = fileContentBase64 && (fields.asset.value || fields.goods.value || '')
                            fields.imageURL.hide = !!file
                        }
                    }),
                    plugin.fields('text').create('imageURL', {
                        value: '',
                        label: 'Image URL',
                        required: false,
                        onchange: function (fields) {
                            updateNote2(fields)
                            if (this.value.trim().length > 0) {
                                fields.file.hide = true
                                fields.loadedImage.value = this.value
                            } else {
                                fields.file.hide = false
                                fields.loadedImage.value = ""
                            }
                        }
                    }),
                    plugin.fields('image').create('loadedImage', {
                        value: ''
                    }),
                    plugin.fields('static').create('note2', {
                        hide: false,
                        value: "Sending not specified image (not filled fields) cleans previous assigned image"
                    }),
                    plugin.fields('asset').create('asset', {
                        value: args.asset || '',
                        label: 'Asset',
                        required: false,
                        account: $rootScope.currentAccount.id_rs,
                        allowFIMK: false,
                        api: api,
                        hide: !args.asset,
                        onchange: function (fields) {
                            fields.formValid.value = fields.asset.value || fields.goods.value || ''
                        }
                    }),
                    plugin.fields('goods').create('goods', {
                        value: args.goods || '',
                        label: 'Goods',
                        required: false,
                        account: $rootScope.currentAccount.id_rs,
                        api: api,
                        hide: !args.goods,
                        onchange: function (fields) {
                            fields.formValid.value = fields.asset.value || fields.goods.value || ''
                        }
                    }),
                    plugin.fields('text').create('formValid', {value: '', hide: true, required: true})
                ]
            }
        }

        plugin.add({
            id: 'assignAssetImage', execute: function (args) {
                args = args || {}
                return plugin.create(angular.extend(args, createFields(args)))
            }
        })

        function updateNote2(fields) {
            fields.note2.hide = (fields.file.value && fields.file.value.length > 0) || fields.imageURL.value
        }

    })

    function encodeImageFileAsURL(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader()
            reader.onloadend = function (event) {
                resolve(event.target.result)
            }
            reader.onerror = reject
            reader.readAsDataURL(file);
        })
    }

})();
