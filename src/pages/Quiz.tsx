import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Brain, Trophy, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Course } from '../types';
import toast from 'react-hot-toast';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

const Quiz: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId && user) {
      if (user.isGuest) {
        loadGuestCourse();
      } else {
        fetchCourseAndQuestions();
      }
    }
  }, [courseId, user]);

  const loadGuestCourse = () => {
    // Mock course data for guest users
    const guestCourses = [
      {
        id: 'guest-course-1',
        user_id: 'guest-user',
        title: 'Introduction to the Force',
        description: 'Learn the fundamentals of Force sensitivity and basic Jedi principles.',
        file_url: 'https://example.com/force-intro.pdf',
        file_type: 'application/pdf',
        progress: 75,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'guest-course-2',
        user_id: 'guest-user',
        title: 'Lightsaber Combat Basics',
        description: 'Master the seven forms of lightsaber combat and defensive techniques.',
        file_url: 'https://example.com/lightsaber-combat.pptx',
        file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        progress: 45,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'guest-course-3',
        user_id: 'guest-user',
        title: 'Meditation and Mindfulness',
        description: 'Develop your connection to the Force through meditation practices.',
        file_url: 'https://example.com/meditation.pdf',
        file_type: 'application/pdf',
        progress: 20,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const foundCourse = guestCourses.find(c => c.id === courseId);
    if (foundCourse) {
      setCourse(foundCourse);
      loadGuestQuestions(foundCourse);
    } else {
      setError('Course not found');
    }
    setLoading(false);
  };

  const loadGuestQuestions = (courseData: Course) => {
    const guestQuestions: Record<string, QuizQuestion[]> = {
      'guest-course-1': [
        {
          id: '1',
          question: 'What is the Force according to Jedi teachings?',
          options: [
            'An energy field created by all living things',
            'A supernatural power only some possess',
            'A technology developed by ancient civilizations',
            'A form of advanced telepathy'
          ],
          correct_answer: 0,
          explanation: 'The Force is an energy field created by all living things that surrounds us, penetrates us, and binds the galaxy together.'
        },
        {
          id: '2',
          question: 'What is the first step in becoming Force-sensitive?',
          options: [
            'Learning lightsaber combat',
            'Meditation and mindfulness practice',
            'Studying ancient Jedi texts',
            'Building a lightsaber'
          ],
          correct_answer: 1,
          explanation: 'Meditation and mindfulness are fundamental to developing Force sensitivity and awareness.'
        },
        {
          id: '3',
          question: 'What distinguishes the light side from the dark side of the Force?',
          options: [
            'Power level and strength',
            'Emotional control and selflessness vs. passion and selfishness',
            'Age and experience',
            'Natural talent and ability'
          ],
          correct_answer: 1,
          explanation: 'The light side emphasizes emotional control, selflessness, and peace, while the dark side is driven by passion, anger, and selfishness.'
        }
      ],
      'guest-course-2': [
        {
          id: '1',
          question: 'How many forms of lightsaber combat are there?',
          options: [
            'Five forms',
            'Seven forms',
            'Ten forms',
            'Three forms'
          ],
          correct_answer: 1,
          explanation: 'There are seven traditional forms of lightsaber combat, each with its own philosophy and techniques.'
        },
        {
          id: '2',
          question: 'What is Form I (Shii-Cho) known for?',
          options: [
            'Aggressive offense',
            'Basic fundamentals and foundation',
            'Defensive mastery',
            'Dual-blade techniques'
          ],
          correct_answer: 1,
          explanation: 'Form I (Shii-Cho) is the foundation form that teaches basic lightsaber fundamentals and is learned by all Jedi.'
        }
      ],
      'guest-course-3': [
        {
          id: '1',
          question: 'What is the primary purpose of Jedi meditation?',
          options: [
            'To increase physical strength',
            'To connect with the Force and find inner peace',
            'To communicate with other Jedi',
            'To predict the future'
          ],
          correct_answer: 1,
          explanation: 'Jedi meditation helps connect with the Force, find inner peace, and maintain emotional balance.'
        },
        {
          id: '2',
          question: 'How often should a Jedi practice meditation?',
          options: [
            'Only when facing difficult decisions',
            'Daily, as a regular practice',
            'Once a week',
            'Only during formal training'
          ],
          correct_answer: 1,
          explanation: 'Daily meditation is essential for maintaining Force connection and emotional balance.'
        }
      ]
    };

    const courseQuestions = guestQuestions[courseData.id] || [];
    setQuestions(courseQuestions);
  };

  const fetchCourseAndQuestions = async () => {
    if (!courseId || !user || user.isGuest) return;

    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('user_id', user.id)
        .single();

      if (courseError) {
        throw new Error('Course not found');
      }
      
      setCourse(courseData);

      // Fetch quiz questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });

      if (questionsError) {
        throw new Error('Failed to load quiz questions');
      }

      if (!questionsData || questionsData.length === 0) {
        setError('No quiz questions available for this course yet. Please try re-uploading the course to generate questions.');
        setLoading(false);
        return;
      }

      // Validate and format questions
      const validQuestions = questionsData
        .filter(q => q.question && q.options && Array.isArray(q.options) && q.options.length === 4)
        .map(q => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation || 'No explanation available.'
        }));

      if (validQuestions.length === 0) {
        setError('Quiz questions are corrupted. Please try re-uploading the course.');
        setLoading(false);
        return;
      }

      setQuestions(validQuestions);
    } catch (error: any) {
      console.error('Error fetching course and questions:', error);
      setError(error.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...userAnswers, selectedAnswer];
    setUserAnswers(newAnswers);
    setShowResult(true);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setQuizCompleted(true);
        updateCourseProgress(newAnswers);
      }
    }, 2000);
  };

  const updateCourseProgress = async (answers: number[]) => {
    if (!course || !user) return;

    const correctAnswers = answers.filter((answer, index) => answer === questions[index].correct_answer).length;
    const progressPercentage = Math.round((correctAnswers / questions.length) * 100);

    if (user.isGuest) {
      const pointsEarned = correctAnswers * 10;
      toast.success(`Quiz completed! You would have earned ${pointsEarned} points with an account.`);
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .update({ progress: Math.max(course.progress, progressPercentage) })
        .eq('id', course.id);

      if (error) throw error;

      // Update user points
      const pointsEarned = correctAnswers * 10;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          total_points: user.total_points + pointsEarned,
          last_activity: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success(`Quiz completed! You earned ${pointsEarned} points.`);
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to save progress');
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setShowResult(false);
    setQuizCompleted(false);
  };

  const retryLoading = () => {
    setLoading(true);
    setError(null);
    if (user?.isGuest) {
      loadGuestCourse();
    } else {
      fetchCourseAndQuestions();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-[#E1E8F0] pl-64 pt-16">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3CA7E0] mx-auto mb-4"></div>
            <p className="text-[#BFC9D9]">Loading quiz questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-[#E1E8F0] pl-64 pt-16">
        <div className="max-w-4xl mx-auto p-8">
          <motion.button
            onClick={() => navigate('/courses')}
            className="flex items-center space-x-2 text-[#3CA7E0] hover:text-[#5ED3F3] transition-colors duration-200 mb-6"
            whileHover={{ x: -5 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Courses</span>
          </motion.button>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#CBD5E1] text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-[#2E3A59] mb-4">Quiz Not Available</h1>
            <p className="text-[#BFC9D9] mb-6">{error}</p>
            
            <div className="flex justify-center space-x-4">
              <motion.button
                onClick={retryLoading}
                className="px-6 py-3 bg-[#3CA7E0] text-white rounded-lg font-semibold flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className="h-5 w-5" />
                <span>Retry</span>
              </motion.button>
              <motion.button
                onClick={() => navigate('/courses')}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back to Courses
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-[#E1E8F0] pl-64 pt-16">
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#2E3A59] mb-4">Course not found</h1>
            <button
              onClick={() => navigate('/courses')}
              className="px-6 py-3 bg-[#3CA7E0] text-white rounded-lg font-semibold"
            >
              Back to Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  const correctAnswers = userAnswers.filter((answer, index) => answer === questions[index].correct_answer).length;
  const scorePercentage = Math.round((correctAnswers / questions.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-[#E1E8F0] pl-64 pt-16">
      <div className="max-w-4xl mx-auto p-8">
        <motion.button
          onClick={() => navigate('/courses')}
          className="flex items-center space-x-2 text-[#3CA7E0] hover:text-[#5ED3F3] transition-colors duration-200 mb-6"
          whileHover={{ x: -5 }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Courses</span>
        </motion.button>

        {!quizCompleted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-8 border border-[#CBD5E1]"
          >
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-[#2E3A59] flex items-center space-x-3">
                  <Brain className="h-7 w-7 text-[#3CA7E0]" />
                  <span>{course.title} - Quiz</span>
                  {user?.isGuest && (
                    <span className="text-sm bg-[#5ED3F3] text-white px-3 py-1 rounded-full">
                      Demo
                    </span>
                  )}
                </h1>
                <div className="text-sm text-[#BFC9D9]">
                  Question {currentQuestion + 1} of {questions.length}
                </div>
              </div>
              
              <div className="w-full bg-[#F3F4F6] rounded-full h-2 mb-6">
                <motion.div
                  className="bg-[#3CA7E0] h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold text-[#2E3A59] mb-6">
                  {questions[currentQuestion].question}
                </h2>

                <div className="space-y-3 mb-8">
                  {questions[currentQuestion].options.map((option, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showResult}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                        showResult
                          ? index === questions[currentQuestion].correct_answer
                            ? 'border-green-500 bg-green-50 text-green-800'
                            : index === selectedAnswer && index !== questions[currentQuestion].correct_answer
                            ? 'border-red-500 bg-red-50 text-red-800'
                            : 'border-[#CBD5E1] bg-gray-50 text-[#BFC9D9]'
                          : selectedAnswer === index
                          ? 'border-[#3CA7E0] bg-[#5ED3F3]/10 text-[#2E3A59]'
                          : 'border-[#CBD5E1] hover:border-[#3CA7E0] hover:bg-[#5ED3F3]/5 text-[#2E3A59]'
                      }`}
                      whileHover={!showResult ? { scale: 1.02 } : {}}
                      whileTap={!showResult ? { scale: 0.98 } : {}}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          showResult && index === questions[currentQuestion].correct_answer
                            ? 'border-green-500 bg-green-500'
                            : showResult && index === selectedAnswer && index !== questions[currentQuestion].correct_answer
                            ? 'border-red-500 bg-red-500'
                            : selectedAnswer === index
                            ? 'border-[#3CA7E0] bg-[#3CA7E0]'
                            : 'border-[#CBD5E1]'
                        }`}>
                          {showResult && index === questions[currentQuestion].correct_answer && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                          {showResult && index === selectedAnswer && index !== questions[currentQuestion].correct_answer && (
                            <XCircle className="h-4 w-4 text-white" />
                          )}
                          {!showResult && selectedAnswer === index && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="font-medium">{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#F5F7FA] rounded-lg p-4 mb-6"
                  >
                    <h3 className="font-semibold text-[#2E3A59] mb-2">Explanation:</h3>
                    <p className="text-[#BFC9D9]">{questions[currentQuestion].explanation}</p>
                  </motion.div>
                )}

                <div className="flex justify-end">
                  <motion.button
                    onClick={handleNextQuestion}
                    disabled={selectedAnswer === null}
                    className="px-6 py-3 bg-[#3CA7E0] text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={selectedAnswer !== null ? { scale: 1.05 } : {}}
                    whileTap={selectedAnswer !== null ? { scale: 0.95 } : {}}
                  >
                    {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-8 border border-[#CBD5E1] text-center"
          >
            <Trophy className="h-16 w-16 text-[#3CA7E0] mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-[#2E3A59] mb-4">Quiz Completed!</h1>
            
            <div className="mb-6">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(scorePercentage)}`}>
                {scorePercentage}%
              </div>
              <p className="text-[#BFC9D9]">
                You got {correctAnswers} out of {questions.length} questions correct
              </p>
              {user?.isGuest && (
                <p className="text-sm text-blue-600 mt-2">
                  Create an account to save your progress and earn points!
                </p>
              )}
            </div>

            <div className="flex justify-center space-x-4">
              <motion.button
                onClick={restartQuiz}
                className="px-6 py-3 bg-[#5ED3F3] text-white rounded-lg font-semibold flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCcw className="h-5 w-5" />
                <span>Retake Quiz</span>
              </motion.button>
              <motion.button
                onClick={() => navigate('/courses')}
                className="px-6 py-3 bg-[#3CA7E0] text-white rounded-lg font-semibold"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back to Courses
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Quiz;