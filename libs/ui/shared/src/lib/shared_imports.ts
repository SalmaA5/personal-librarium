import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Select } from 'primeng/select';

export const FORM_IMPORTS = [ReactiveFormsModule, FormsModule];
export const ROUTER_IMPORTS = [RouterLink, RouterLinkActive];

export const PRIMENG_IMPORTS = [Select] as const;
