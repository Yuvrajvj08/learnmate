import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Brain,
  Repeat,
  Trophy,
  ShieldCheck,
  Zap,
  BarChart3,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Hero3D } from '@/components/landing/Hero3D';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useProfile } from '@/context/ProfileContext';
import { tasksApi } from '@/api/tasks';
import { sourcesApi } from '@/api/sources';

const SAMPLE_STUDY_MATERIAL = `CHAPTER 1: ELECTRIC CHARGES AND FIELDS

1.1 INTRODUCTION
All of us have the experience of seeing a spark or hearing a crackle when we take off our synthetic clothes or sweater, particularly in dry weather. This is almost inevitable with ladies garments like a polyester saree. Have you ever tried to find any explanation for this phenomenon? Another common example of electric discharge is the lightning that we see in the sky during thunderstorms. We also experience a sensation of an electric shock either while opening the door of a car or holding the iron bar of a bus after sliding from our seat. The reason for these experiences is discharge of electric charges through our body, which were accumulated on certain materials due to friction.

1.2 ELECTRIC CHARGE
Historically the credit of discovery of the fact that amber rubbed with wool or silk cloth attracts light objects goes to Thales of Miletus, Greece, around 600 BC. The name electricity is coined from the Greek word elektron meaning amber. Many such pairs of materials were known which on rubbing could attract light objects like straw, pith balls and bits of papers.
There are two kinds of electrification and we find that:
(i) Like charges repel and (ii) Unlike charges attract each other.
The property which differentiates the two kinds of charges is called the polarity of charge. When a glass rod is rubbed with silk, the charge acquired by the rod was called positive and that by silk was called negative by Benjamin Franklin.

1.3 CONDUCTORS AND INSULATORS
Some substances readily allow passage of electricity through them, others do not. Those which allow electricity to pass through them easily are called conductors. They have electric charges (electrons) that are comparatively free to move inside the material. Metals, humans, earth and animal bodies are conductors. Most of the non-metals like glass, porcelain, plastic, nylon, wood offer high resistance to the passage of electricity through them. They are called insulators.
When some charge is transferred to a conductor, it readily gets distributed over the entire surface of the conductor. In contrast, if some charge is put on an insulator, it stays at the same place.

1.4 BASIC PROPERTIES OF ELECTRIC CHARGE
We have seen that there are two types of charges, namely positive and negative and their effects tend to cancel each other. Here, we shall address some important properties of the electric charge.
(i) Additivity of charges: If a system contains two point charges q1 and q2, the total charge of the system is obtained simply by adding them algebraically. That is, total charge Q = q1 + q2.
(ii) Charge is conserved: The total charge of an isolated system is always conserved. It is not possible to create or destroy net electric charge.
(iii) Quantisation of charge: Experimentally it is established that all free charges are integral multiples of a basic unit of charge denoted by e. Thus, charge q on a body is always given by:
q = n * e, where n is any integer, positive or negative, and e is the charge of an electron (1.602 x 10^-19 C).

1.5 COULOMB'S LAW
Coulomb’s law is a quantitative statement about the force between two point charges. When the linear sizes of charged bodies are much smaller than the distance separating them, the size may be ignored and the charges are treated as point charges.
Coulomb measured the force between two point charges and found that it varied inversely as the square of the distance between the charges and was directly proportional to the product of the magnitude of the two charges and acted along the line joining the two charges.
Mathematically, the electrostatic force F between two charges q1 and q2 separated by distance r in vacuum is:
F = (1 / (4 * pi * epsilon_0)) * (|q1 * q2| / r^2)
where epsilon_0 is the permittivity of free space, having the value 8.854 x 10^-12 C^2 / (N m^2). The constant k = 1 / (4 * pi * epsilon_0) is approximately 9 x 10^9 N m^2 / C^2.

1.6 ELECTRIC FIELD
Let us consider a point charge Q placed in vacuum at the origin O. If we place another point charge q at a point P, where OP = r, then the charge Q exerts a force on q given by Coulomb’s law. We may say that the charge Q produces an electric field everywhere in the surrounding space. When another charge q is brought at some point P, the field there acts on it and produces a force.
The electric field E produced by the charge Q at a point r is given by:
E(r) = (1 / (4 * pi * epsilon_0)) * (Q / r^2) * r_hat
where r_hat is a unit vector from the origin to the point r. Thus, each point in space around the charge Q is characterised by a vector quantity called the electric field.
The SI unit of electric field is Newton per Coulomb (N/C) or Volt per metre (V/m).`;

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  const handleStartLearning = () => {
    navigate('/dashboard');
  };

  const handleLoadDemoContent = async () => {
    if (!activeProfile) {
      navigate('/dashboard');
      return;
    }
    setIsSeedingDemo(true);
    try {
      // Create a demo task
      const newTask = await tasksApi.create({
        student_id: activeProfile.id,
        title: 'Physics: Electric Charges and Fields',
        subject: 'Physics',
        source_type: 'pasted_text',
      });

      // Ingest the sample material
      await sourcesApi.pasteText(newTask.id, {
        raw_text: SAMPLE_STUDY_MATERIAL,
        title: 'Physics: Electric Charges and Fields',
        subject: 'Physics',
      });

      // Directly open the task in Stage 1 Learn
      navigate(`/tasks/${newTask.id}/learn`);
    } catch (err) {
      console.error('Failed to create demo task:', err);
      navigate('/dashboard');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const steps = [
    {
      num: '01',
      stage: 'Stage 1',
      title: 'Learn',
      subtitle: 'Understand concepts grounded in your source material',
      description:
        'Upload any textbook chapter, notes, or PDF. LearnMate breaks down topics with verifiable citations, clear takeaways, and grounded Q&A.',
      icon: <BookOpen className="w-6 h-6 text-violet-400" />,
      color: 'from-violet-600/20 to-indigo-600/10 border-violet-500/30',
    },
    {
      num: '02',
      stage: 'Stage 2',
      title: 'Diagnose',
      subtitle: 'Pinpoint knowledge gaps and possible misconceptions',
      description:
        'Take a diagnostic quiz with 3-tier confidence tracking (Low/Med/High). Pure Python deterministic scoring classifies answers into Mastered, Fragile, or Misconception.',
      icon: <Brain className="w-6 h-6 text-rose-400" />,
      color: 'from-rose-600/20 to-pink-600/10 border-rose-500/30',
    },
    {
      num: '03',
      stage: 'Stage 3',
      title: 'Revise',
      subtitle: 'Follow an actionable, priority-ordered revision plan',
      description:
        'No generic revision. LearnMate generates targeted reteaching, memory hooks, must-read pages, and practice activities sorted by diagnostic severity.',
      icon: <Repeat className="w-6 h-6 text-amber-400" />,
      color: 'from-amber-600/20 to-orange-600/10 border-amber-500/30',
    },
    {
      num: '04',
      stage: 'Stage 4',
      title: 'Master',
      subtitle: 'Retest targeted gaps and compare evidence-based gains',
      description:
        'Attempt a targeted follow-up quiz. See side-by-side baseline accuracy differences in real percentage points and verify conceptual growth.',
      icon: <Trophy className="w-6 h-6 text-emerald-400" />,
      color: 'from-emerald-600/20 to-cyan-600/10 border-emerald-500/30',
    },
  ];

  return (
    <PageContainer>
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline and Call-to-actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-600/10 border border-violet-500/20 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">
                  AI-Powered Adaptive Learning Companion
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                Learn smarter.{' '}
                <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                  Understand deeper.
                </span>{' '}
                Improve with every attempt.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Turn your study material into personalised explanations, targeted practice,
                and an adaptive learning plan built around what you actually understand.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Button
                  size="lg"
                  variant="glow"
                  onClick={handleStartLearning}
                  icon={<ArrowRight className="w-5 h-5" />}
                  className="w-full sm:w-auto"
                >
                  Start Learning
                </Button>

                <Button
                  size="lg"
                  variant="secondary"
                  isLoading={isSeedingDemo}
                  onClick={handleLoadDemoContent}
                  icon={<Zap className="w-5 h-5 text-amber-400" />}
                  className="w-full sm:w-auto"
                >
                  Try with Sample Material
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-4 text-left">
                <div>
                  <div className="text-lg font-bold text-white">100% Grounded</div>
                  <div className="text-xs text-slate-400">Verifiable page citations</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-violet-400">Deterministic</div>
                  <div className="text-xs text-slate-400">Python-calculated scores</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-cyan-400">4 Stages</div>
                  <div className="text-xs text-slate-400">Completely unblocked</div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Workspace Card */}
            <div className="lg:col-span-5 flex justify-center">
              <Hero3D />
            </div>
          </div>
        </div>
      </section>

      {/* How LearnMate Works Section */}
      <section id="how-it-works" className="py-20 border-t border-white/[0.05] bg-[#0c0f22]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="violet" size="md">
              4-Stage Learning Journey
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              From study material to proven mastery
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Traditional tools offer static flashcards or generic quizzes. LearnMate continuously
              bridges understanding, diagnosis, targeted revision, and measured improvement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <Card
                key={step.num}
                variant="glass"
                className={`p-6 bg-gradient-to-b ${step.color} border transition-all duration-300 hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-center shadow">
                    {step.icon}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">{step.num}</span>
                </div>
                <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
                  {step.stage}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
              </Card>
            ))}
          </div>

          {/* Principle Banner */}
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-violet-900/30 via-indigo-900/20 to-slate-900/40 border border-violet-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Strict Non-Artificial Stage Locking Guarantee
              </h4>
              <p className="text-xs text-slate-300 max-w-2xl">
                Every stage in LearnMate is directly accessible at any time. You can jump straight to
                revision, take a diagnostic without finishing reading, or revisit past attempts freely.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleStartLearning}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              Open Workspace
            </Button>
          </div>
        </div>
      </section>
    </PageContainer>
  );
};
