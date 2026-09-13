import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiWeb } from './ui-web';

describe('UiWeb', () => {
  let component: UiWeb;
  let fixture: ComponentFixture<UiWeb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiWeb],
    }).compileComponents();

    fixture = TestBed.createComponent(UiWeb);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
