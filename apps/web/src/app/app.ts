import { Component } from '@angular/core';
import { ShellComponent } from './shell/shell.component';

@Component({
  imports: [ShellComponent],
  selector: 'app-root',
  template: '<app-shell />',
})
export class App {}
