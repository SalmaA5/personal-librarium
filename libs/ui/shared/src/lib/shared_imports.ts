import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Chip } from 'primeng/chip';
import { InputNumber } from 'primeng/inputnumber';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Divider } from 'primeng/divider';
import { ProgressBar } from 'primeng/progressbar';
import { Rating } from 'primeng/rating';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Skeleton } from 'primeng/skeleton';
import { Toast } from 'primeng/toast';

export const FORM_IMPORTS = [ReactiveFormsModule, FormsModule];
export const ROUTER_IMPORTS = [RouterLink, RouterLinkActive];

export const PRIMENG_IMPORTS = [
  Select,
  Rating,
  Chip,
  ConfirmDialog,
  Toast,
  ProgressBar,
  Skeleton,
  SelectButton,
  Divider,
  InputNumber,
] as const;
