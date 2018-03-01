'use strict';

angular.module('mean.icu.data.attachmentsservice', [])
    .service('AttachmentsService', function ($http, $timeout, ApiUri, Upload, UsersService, WarningsService) {

    function getAttachmentUser(attachment) {
            return UsersService.getById(attachment.creator).then(user => {
                //console.log(user) ;
                return user ;
            }) ;            
    }    

    function previewTab(document1) {
        console.dir(document1);
        if(document1.spPath){
            var spSite = document1.spPath.substring(0,document1.spPath.indexOf('ICU')+3);
            console.log("SPSITE:");
            console.log(spSite);
            var uri = spSite+"/_layouts/15/WopiFrame.aspx?sourcedoc="+document1.spPath+"&action=default";
            console.log("URI:");
            console.log(uri);
            window.open(uri,'_blank');
        }
        else{
        // Check if need to view as pdf
        if ((document1.documentType == "docx") ||
            (document1.documentType == "doc") ||
            (document1.documentType == "xlsx") ||
            (document1.documentType == "xls") ||
            (document1.documentType == "ppt") ||
            (document1.documentType == "pptx")) {
            var arr = document1.path.split("." + document1.documentType);
            var ToHref = arr[0] + ".pdf";
            // Check if convert file exists allready
            console.log("ToHref");
            console.log(ToHref);
            $http({
                url: ToHref.replace('/files/', '/api/files/'),
                method: 'HEAD'
            }).success(function() {
                // There is allready the convert file
                window.open(ToHref + '?view=true')
            }).error(function() {
                // Send to server
                $.post('/officeDocsAppend.js', document1).done(function(document2) {
                    // The convert is OK and now we open the pdf to the client in new window
                    window.open(ToHref + '?view=true');
                }).fail(function(xhr) {
                    console.error(xhr.responseText);
                });
            });
        }
        // Format is NOT needed to view as pdf
        else {
            window.open(document1.path + '?view=true');
        }
    }
    };

    return {
        previewTab: previewTab,
        getAttachmentUser: getAttachmentUser
    };

});
