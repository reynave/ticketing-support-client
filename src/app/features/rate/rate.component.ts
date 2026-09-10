import { Component } from '@angular/core';
import { inject, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';
@Component({
  selector: 'app-rate',
  standalone: true,
  imports: [RouterModule, CommonModule, NgbRatingModule ],
  templateUrl: './rate.component.html',
  styleUrl: './rate.component.css'
})
export class RateComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
caseId: string = '';
ratingQuestions: any[] = [];
  ngOnInit(): void {
     this.caseId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    // Initialization logic here
    this.loadMasterData()
  }
  loadMasterData(){
    // http://localhost:3000/api/rating/master?status=1
    this.apiService.get('/rating/master?status=1').subscribe({
      next: (response) => {
        console.log(response);
        this.ratingQuestions = response.data;
        for (let question of this.ratingQuestions) {
          if (!question.value) {
            question.value = 3;
          }
        }
        // Handle the response here
      },
      error: (error) => {
        // Handle the error here
      }
    });
  }
  goBack() {
    history.back();
  }
}
