import React from "react";
import { format } from "date-fns";
import { Award, Download, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CertificateGenerator({ 
  userName, 
  courseName, 
  completedDate, 
  certificateId, 
  score 
}) {
  const generateCertificatePDF = () => {
    // Create certificate HTML
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { size: A4 landscape; margin: 0; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .certificate {
            width: 297mm;
            height: 210mm;
            padding: 40px;
            background: white;
            position: relative;
            box-sizing: border-box;
          }
          .certificate-border {
            border: 15px solid;
            border-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%) 1;
            padding: 40px;
            height: 100%;
            box-sizing: border-box;
            position: relative;
          }
          .certificate-content {
            text-align: center;
            position: relative;
            top: 50%;
            transform: translateY(-50%);
          }
          .logo {
            font-size: 48px;
            font-weight: 900;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
          }
          .title {
            font-size: 64px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 30px;
            letter-spacing: 2px;
          }
          .subtitle {
            font-size: 24px;
            color: #64748b;
            margin-bottom: 40px;
          }
          .recipient-name {
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
            margin: 30px 0;
            border-bottom: 3px solid #667eea;
            display: inline-block;
            padding-bottom: 10px;
          }
          .course-name {
            font-size: 32px;
            color: #1e293b;
            margin: 30px 0;
            font-style: italic;
          }
          .details {
            font-size: 18px;
            color: #64748b;
            margin: 40px 0;
          }
          .score-badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            border-radius: 50px;
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            position: absolute;
            bottom: 40px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-around;
            padding: 0 100px;
          }
          .signature-line {
            border-top: 2px solid #1e293b;
            width: 250px;
            padding-top: 10px;
            text-align: center;
          }
          .certificate-id {
            position: absolute;
            bottom: 20px;
            right: 40px;
            font-size: 12px;
            color: #94a3b8;
          }
          .corner-decoration {
            position: absolute;
            width: 80px;
            height: 80px;
            border: 5px solid #667eea;
          }
          .top-left { top: 60px; left: 60px; border-right: none; border-bottom: none; }
          .top-right { top: 60px; right: 60px; border-left: none; border-bottom: none; }
          .bottom-left { bottom: 60px; left: 60px; border-right: none; border-top: none; }
          .bottom-right { bottom: 60px; right: 60px; border-left: none; border-top: none; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="certificate-border">
            <div class="corner-decoration top-left"></div>
            <div class="corner-decoration top-right"></div>
            <div class="corner-decoration bottom-left"></div>
            <div class="corner-decoration bottom-right"></div>
            
            <div class="certificate-content">
              <div class="logo">🎓 Pro-Session</div>
              <div class="title">CERTIFICATE OF COMPLETION</div>
              <div class="subtitle">This is to certify that</div>
              
              <div class="recipient-name">${userName}</div>
              
              <div class="subtitle">has successfully completed</div>
              
              <div class="course-name">${courseName}</div>
              
              ${score ? `<div class="score-badge">⭐ Final Score: ${score}%</div>` : ''}
              
              <div class="details">
                Completed on ${format(new Date(completedDate), 'MMMM dd, yyyy')}
                <br/>
                Demonstrating excellence in professional development and continuous learning
              </div>
            </div>
            
            <div class="footer">
              <div class="signature-line">
                <strong>Director of Education</strong><br/>
                Pro-Session Academy
              </div>
              <div class="signature-line">
                <strong>Date of Issue</strong><br/>
                ${format(new Date(completedDate), 'MM/dd/yyyy')}
              </div>
            </div>
            
            <div class="certificate-id">Certificate ID: ${certificateId}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([certificateHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificate_${courseName.replace(/\s+/g, '_')}_${certificateId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-4 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-2xl">
      <CardContent className="p-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Award className="w-16 h-16 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 mb-2">🎉 Congratulations!</h2>
          <p className="text-lg text-slate-700 mb-6">
            You've earned your certificate for completing<br/>
            <strong className="text-2xl text-blue-600">{courseName}</strong>
          </p>
          
          {score && (
            <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full mb-6">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-white" />
                <span className="font-bold text-xl">Final Score: {score}%</span>
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          )}
          
          <div className="space-y-3 mb-6">
            <p className="text-slate-600">
              <strong>Recipient:</strong> {userName}
            </p>
            <p className="text-slate-600">
              <strong>Completed:</strong> {format(new Date(completedDate), 'MMMM dd, yyyy')}
            </p>
            <p className="text-xs text-slate-500">
              Certificate ID: {certificateId}
            </p>
          </div>
          
          <Button 
            size="lg" 
            onClick={generateCertificatePDF}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Certificate
          </Button>
          
          <p className="text-xs text-slate-500 mt-4">
            💡 Open the downloaded HTML file in your browser, then use Print → Save as PDF for a professional certificate
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default CertificateGenerator;