import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-add-category-popup',
  templateUrl: './add-category-popup.component.html',
  styleUrls: ['./add-category-popup.component.scss'],
})
export class AddCategoryPopupComponent implements OnInit {
  title = '';
  categoryForm: FormGroup;
  constructor(
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<AddCategoryPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.title = data?.node?.category_name ? `Add subcategory for ${data?.node?.category_name}` : `Add category`;
    this.categoryForm = this.formBuilder.group({
      category_name: [''],
    });
  }

  ngOnInit(): void {}

  close() {
    this.dialogRef.close();
  }

  get categoryName() {
    return this.categoryForm.get('category_name')?.value;
  }
}
