import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiMobile } from './ui-mobile';

describe('UiMobile', () => {
  let component: UiMobile;
  let fixture: ComponentFixture<UiMobile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiMobile],
    }).compileComponents();

    fixture = TestBed.createComponent(UiMobile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
