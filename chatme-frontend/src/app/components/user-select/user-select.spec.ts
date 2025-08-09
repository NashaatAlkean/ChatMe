import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSelect } from './user-select';

describe('UserSelect', () => {
  let component: UserSelect;
  let fixture: ComponentFixture<UserSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
