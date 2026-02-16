import React, { useState, useEffect } from 'react';
import { Comentario } from '../types/models';
import { NewsService } from '../services/contentService';
import { useAuth } from '../contexts/AuthContext';

interface CommentsSectionProps {
    clubId: number;
    noticiaId: number;
    onClose?: () => void;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ clubId, noticiaId }) => {
    const { usuario } = useAuth();
    const [comments, setComments] = useState<Comentario[]>([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComments();
    }, [clubId, noticiaId]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const data = await NewsService.getComments(clubId, noticiaId);
            setComments(data);
        } catch (error) {
            console.error("Error loading comments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const created = await NewsService.postComment(clubId, noticiaId, newComment);
            setComments([...comments, created]);
            setNewComment("");
        } catch (error) {
            console.error("Error posting comment", error);
            alert("Error al publicar comentario");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: number) => {
        if (!window.confirm("¿Seguro que quieres borrar este comentario?")) return;
        try {
            await NewsService.deleteComment(clubId, noticiaId, commentId);
            setComments(comments.filter(c => c.id !== commentId));
        } catch (error) {
            console.error("Error deleting comment", error);
        }
    };

    return (
        <div className="comments-section" style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
            <h4 style={{ marginBottom: '1rem', color: '#333' }}>Comentarios ({comments.length})</h4>
            
            <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {loading ? (
                    <p style={{ color: '#666', fontSize: '0.9em' }}>Cargando comentarios...</p>
                ) : comments.length === 0 ? (
                    <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9em' }}>No hay comentarios aún. ¡Sé el primero!</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="comment" style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: '8px' }}>
                            <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85em' }}>
                                <span style={{ fontWeight: 600, color: '#4b5563' }}>{comment.autor?.nombre_completo || 'Usuario'}</span>
                                <span style={{ color: '#9ca3af' }}>{new Date(comment.fecha_creacion).toLocaleDateString()}</span>
                            </div>
                            <div className="comment-body" style={{ fontSize: '0.95em', color: '#1f2937', whiteSpace: 'pre-wrap' }}>
                                {comment.contenido}
                            </div>
                            {usuario && (usuario.id === comment.autor_id || usuario.es_superadmin) && (
                                <button 
                                    onClick={() => handleDelete(comment.id)} 
                                    style={{ 
                                        background: 'none', border: 'none', color: '#ef4444', 
                                        fontSize: '0.8em', cursor: 'pointer', marginTop: '4px',
                                        padding: 0, textDecoration: 'underline'
                                    }}
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="form-control"
                    rows={2}
                    style={{ 
                        width: '100%', padding: '10px', borderRadius: '6px', 
                        border: '1px solid #d1d5db', fontSize: '0.95em', resize: 'vertical'
                    }}
                />
                <button 
                    type="submit" 
                    disabled={submitting || !newComment.trim()}
                    className="btn btn-sm" // Assuming btn-sm exists globally now? Or use inline style fallback
                    style={{ 
                        alignSelf: 'flex-end', 
                        background: submitting ? '#9ca3af' : '#2563eb', 
                        color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px',
                        cursor: submitting ? 'default' : 'pointer'
                    }}
                >
                    {submitting ? 'Enviando...' : 'Publicar'}
                </button>
            </form>
        </div>
    );
};

export default CommentsSection;
