$(document).ready(function(){
	$('.delete-equipment').on('click', function(){
		var property_no = $(this).data('property_no');
		var component_no = $(this).data('component_no');
		var url = '/delete/' + property_no + '/' + component_no;
		if(confirm('Delete Equipment?')){
			$.ajax({ 
				url: url,
				type: 'DELETE',
				success: function(result){
					console.log('Deleting equipment.....');
					window.location.href='/';
				},
				error: function(err){
					console.log(err);
				}
			});
		}
	});

	$('.edit-equipment').on('click', function(){
		$('#edit-form-article_name').val($(this).data('article_name'));
		$('#edit-form-description').val($(this).data('description'));
		$('#edit-form-unit_cost').val($(this).data('unit_cost'));
		$('#edit-form-date_acquired').val($(this).data('date_acquired'));
		$('#edit-form-status').val($(this).data('status'));
		$('#edit-form-property_no').val($(this).data('property_no'));
		$('#edit-form-component_no').val($(this).data('component_no'));
	});

	$('.move-equipment').on('click', function(){
		$('#move-form-article_name').val($(this).data('article_name'));
		$('#move-form-description').val($(this).data('description'));
		$('#move-form-unit_cost').val($(this).data('unit_cost'));
		$('#move-form-date_acquired').val($(this).data('date_acquired'));
		$('#move-form-status').val($(this).data('status'));
		$('#move-form-property_no').val($(this).data('property_no'));
		$('#move-form-component_no').val($(this).data('component_no'));
		$('#move-form-property_no1').val($(this).data('property_no'));
		$('#move-form-component_no1').val($(this).data('component_no'));
	});

	$('.submits').on('click', function(){
		var files = $('#upload-input').get(0).files;
		if (files.length > 0){
		// create a FormData object which will be sent as the data payload in the
		// AJAX request
		var formData = new FormData();
		// loop through all the selected files and add them to the formData object
		for (var i = 0; i < files.length; i++) {
		  var file = files[i];
		  // add the files to formData object for the data payload
		  formData.append('equipment_images', file, file.name);
		}
		$.ajax({
			url: '/upload',
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: function(data){
				console.log('upload successful!\n' + data);
			}
		});

		}
	});
});
