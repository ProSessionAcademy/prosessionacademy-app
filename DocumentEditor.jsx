import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, X, User, Clock, Edit2, Eye } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function DocumentEditor({ document, onSave, onCancel, currentUser }) {
  const [content, setContent] = useState(document?.content || '');
  const [isEditing, setIsEditing] = useState(!document?.content);
  const [lastSaved, setLastSaved] = useState(null);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const handleSave = () => {
    onSave({
      ...document,
      content: content,
      last_edited_by: currentUser?.email,
      last_edited_by_name: currentUser?.full_name,
      last_edited_at: new Date().toISOString()
    });
    setIsEditing(false);
    setLastSaved(new Date());
  };

  return (
    <Card className="border-none shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{document?.title}</CardTitle>
            {document?.description && (
              <p className="text-white/90 text-sm mt-1">{document?.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={onCancel}
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Document Info */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>Uploaded by {document?.uploaded_by_name}</span>
            </div>
            {document?.last_edited_by && (
              <div className="flex items-center gap-1">
                <Edit2 className="w-4 h-4" />
                <span>Last edited by {document?.last_edited_by_name}</span>
              </div>
            )}
            {document?.last_edited_at && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(document.last_edited_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  onClick={() => {
                    setContent(document?.content || '');
                    setIsEditing(false);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {lastSaved && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✅ Saved at {lastSaved.toLocaleTimeString()}
          </div>
        )}

        {/* Editor / Viewer */}
        <div className="min-h-[500px] border-2 border-slate-200 rounded-lg overflow-hidden">
          {isEditing ? (
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              className="h-[500px]"
            />
          ) : (
            <div className="p-8 prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: content || '<p class="text-slate-400">No content yet. Click Edit to start writing.</p>' }} />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
          <p className="font-semibold mb-2">📝 How it works:</p>
          <ul className="space-y-1 text-xs">
            <li>• Only one person can edit at a time</li>
            <li>• Click "Edit" to start editing, "Save" when done</li>
            <li>• Other members can view the latest saved version</li>
            <li>• Changes are saved with your name and timestamp</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}