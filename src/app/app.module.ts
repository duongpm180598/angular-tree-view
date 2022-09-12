import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent, ChecklistDatabase } from './app.component';
import {MatTreeModule} from '@angular/material/tree';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatRadioModule} from '@angular/material/radio';
@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatTreeModule,
    MatCheckboxModule,
    MatCheckboxModule,
    MatIconModule,
    MatFormFieldModule,
    MatButtonModule,
    MatRadioModule,
    MatCardModule
  ],
  providers: [ChecklistDatabase],
  bootstrap: [AppComponent]
})
export class AppModule { }
