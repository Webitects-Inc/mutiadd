/*
* jQuery webitects multi add plugin
* 
* Setup:
* MultiAdd container must include a child item with class of 'ItemTemplate' and it will be used for cloning.
* ItemTemplate should include a tigger object that has the class of 'remove'
* Each clone will have an appended idx to the ID and names of the input elements.
* options: addTriggerId, ID of add trigger object
*
* Requirements: jquery 1.7
*
* File browser:
* Requires: /tinymce/jscripts/tiny_mce/plugins/filemanager/jscripts/filemanager.js
* Img input field class name should be "file-browse"
*   must have attribute "filetype" with value of "image" or "document"
* Launcher must be a sibling of Img input field and class name should be "file-browse-launcher"
* options: 
*   fileBrowse(bool),  to activate
*   fileBrowseFolder, location of file upload
* 
* TinyMCE:
* Must use at least tinyMCE v3.4
* See comment for tinyMCE 4.x, use tinymce.execCommand('mceAddEditor', false, this.id);
* options: 
*   tinyMCEConfigToClone, its which ever config you'd like to use, if null tinyMCE will not be initialized.
*   tinyMCEEditorSelector, name of the css class selector of tinyMCE textboxes. Must be different from any existing tinyMCE selector, including the selector for the config passed in.
*       default: mceEditorDynamic
* 
* Author: Vince Tan Liao (Webitects)
*/

;(function ($) {
    $.fn.multiAdd = function (options) {
        //Set default options
        var defaults = {
            addTriggerId: '',
            fileBrowse: false,
            fileBrowseFolder: "",
            enableSort: false,
            sortInputPrefix: '',
            enableDatePicker: false,
            tinyMCEEditorSelector: 'mceEditorDynamic', //Should be distinct from any existing tinyMCE selectors
            tinyMCEConfigToClone: null
        };

        //Initialize
        var options = $.extend(defaults, options); //Set options
        var parentContainer = this;
        var addTrigger = $('#' + options.addTriggerId);
        var template = this.find('.ItemTemplate:first').clone();
        var itemCount = this.children(".ItemTemplate").size();
        var multiAddTinyMCE = null;
        if (options.tinyMCEConfigToClone != null) {
            multiAddTinyMCE = options.tinyMCEConfigToClone.clone();
            multiAddTinyMCE.update({
                "editor_selector": options.tinyMCEEditorSelector
            });
        }

        //Error message
        this.AlertError = function (msg) {
            alert("MultiAdd error: " + msg);
            return this;
        }
        //Validate
        if (addTrigger == null) {
            this.AlertError('Add trigger not found');
        }
        if (options.fileBrowse) {
            if (options.fileBrowseFolder == '') {
                this.AlertError('File browser folder not set.');
            }
            if (typeof FileManager == 'undefined') {
                this.AlertError('FileManager script libary not found');
            }
        }
        if (options.enableSort && !options.sortInputPrefix) {
            this.AlertError('sortInputPrefix not set.');
        }
        if (options.enableDatePicker) {
            if (typeof datePickerController == 'undefined') {
                this.AlertError('datepicker script libary not found');
            }
        }

        //Add event
        addTrigger.click(function () {
            itemCount++;
            //Clone template and append to Parent
            var newClone = template.clone()
                .find(':input,.file-browse-launcher').each(function () {
                    var newId = this.id.substring(0, this.id.length - 1) + itemCount;
                    this.id = newId;
                    //Name is not same as id in cases such as multi checkbox list
                    this.name = this.name.substring(0, this.name.length - 1) + itemCount;
                    //Clear values if not checkbox, or uncheck checkbox
                    if ($(this).is(':checkbox')) {
                        $(this).prop('checked', false);
                    }
                    else {
                        $(this).val('');
                    }
                }).end()
                .find('label').each(function () { //Update labels
                    if ($(this).attr('for')) {
                        var newFor = $(this).attr('for').substring(0, $(this).attr('for').length - 1) + itemCount;
                        $(this).attr('for', newFor); // update label for
                    }
                }).end()
                .attr('id', 'ItemTemplate' + itemCount)
                .appendTo(parentContainer);

            //Sort
            if (options.enableSort) {
                newClone.find('[name^="' + options.sortInputPrefix + '"]').val(itemCount);
            }

            //Datepicker
            if (options.enableDatePicker) {
                datePickerController.create();
            }

            //Filebrowse
            if (options.fileBrowse) {
                parentContainer.FindFileBrowseChildrenAndInit(newClone);
            }

            //Initialize TinyMCE
            if (multiAddTinyMCE) {
                newClone.find('.' + options.tinyMCEEditorSelector).each(function () {
                    //Calling tinyMCE.init(config) twice will cause pre-existing initialized tinyMCE boxes to fail.
                    //To add new instances for the same config/selector, use the following command.
                    tinyMCE.execCommand('mceAddControl', false, this.id);
                    //tinymce.execCommand('mceAddEditor', false, this.id); //Use this for tinyMCE 4.x
                }).end();
            }

            //Animate scroll to new element
            $("html:not(:animated),body:not(:animated)").animate({ scrollTop: $(newClone).offset().top - 50 }, 500);
            return false;
        });

        //Remove event action (.on() requires > jQuery 1.7) http://api.jquery.com/live/)
        this.on("click", ".ItemTemplate .remove", function () {
            $(this).parents(".ItemTemplate").fadeOut("fast", function () {
                $(this).remove();
            });
            return false;
        });

        //set for sorting
        var initSortable = function () {
            var sortable = parentContainer.find('.ItemTemplate:first').parent();
            sortable.sortable({
                axis: 'y',
                opacity: 0.6,
                start: function (event, ui) {
                    ui.placeholder.height(ui.item.height());
                    if (options.tinyMCEConfigToClone != null) {
                        //console.log(ui.item.find('.mceEditorDynamic'));
                        ui.item.find('.mceEditorDynamic').each(function () {
                            tinyMCE.execCommand('mceRemoveControl', false, $(this).attr('id'));
                        });
                    }
                },
                stop: function (event, ui) {
                    if (options.tinyMCEConfigToClone != null) {
                        ui.item.find('.mceEditorDynamic').each(function () {
                            tinyMCE.execCommand('mceAddControl', true, $(this).attr('id'));
                            sortable.sortable("refresh");
                        });
                    }
                },
                update: function (event, ui) {
                    var items = sortable.sortable('toArray');
                    var n = 0;
                    items.each(function (index) {
                        var item = sortable.find('#' + index);
                        item.find('[name^="' + options.sortInputPrefix + '"]').val(n);
                        n++;
                    });
                }
            });
        }
        if (options.enableSort) {
            initSortable();
        }

        //FileBrowse
        this.InitFileBrowser = function (inputFieldId, launcherId, fileType, folder) {
            FileManager.create(inputFieldId, {
                context: "element", type: fileType,
                launcher: launcherId,
                folder: folder,
                response: { value: "name" }
            });
        }
        this.FindFileBrowseChildrenAndInit = function (container) {
            $(container).find('.file-browse').each(function () {
                var filetype = $(this).attr('filetype');
                var launcherId = $(this).siblings('.file-browse-launcher:first').attr('id');
                if (typeof filetype == 'undefined' || filetype == '') {
                    this.AlertError('file type not set for ' + $(this).attr('id'));
                }
                if (typeof launcherId == 'undefined') {
                    this.AlertError('Launcher not found for ' + $(this).attr('id'));
                }
                parentContainer.InitFileBrowser($(this).attr('id'), launcherId, filetype, options.fileBrowseFolder);
            }).end();
        }
        //Initialize existing file broswer elements
        if (options.fileBrowse) {
            this.FindFileBrowseChildrenAndInit(parentContainer);
        }

        //TinyMCE
        this.InitMultiAddTinyMCE = function (configToInitialize) {
            //Initialize tinyMCE if config object exists
            if (configToInitialize != null) {
                tinyMCE.init(configToInitialize.toObject());
            }
        }
        //Initialize existing tinyMCE textboxes
        this.InitMultiAddTinyMCE(multiAddTinyMCE);

        return this;
    };
})(jQuery);
