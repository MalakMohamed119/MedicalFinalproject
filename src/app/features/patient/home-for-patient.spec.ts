import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeForPatient } from './home-for-patient';

describe('HomeForPatient', () => {
  let component: HomeForPatient;
  let fixture: ComponentFixture<HomeForPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeForPatient]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeForPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
