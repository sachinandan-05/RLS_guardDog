import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/server';

// Simple button component since shadcn/ui is not installed
const Button = ({ 
  children, 
  variant = 'default', 
  size = 'default',
  className = '',
  asChild = false,
  ...props 
}: {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  asChild?: boolean;
  [key: string]: any;
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'underline-offset-4 hover:underline text-primary',
  };

  const sizes = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md',
    lg: 'h-11 px-8 rounded-md',
  };

  const classNames = [
    baseStyles,
    variants[variant],
    sizes[size],
    className
  ].join(' ');

  if (asChild && props.as) {
    const Child = props.as;
    return <Child className={classNames} {...props}>{children}</Child>;
  }

  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  );
};

export default async function Home() {
  const user = await getCurrentUser();
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            RLS Guard Dog
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Secure Your Data with <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Row-Level Security</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            RLS Guard Dog provides robust access control and data protection for your applications with easy-to-implement row-level security policies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" asChild>
              <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started for Free'}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Role-Based Access',
                description: 'Define fine-grained access controls based on user roles and permissions.'
              },
              {
                title: 'Data Protection',
                description: 'Ensure users only see the data they are authorized to access.'
              },
              {
                title: 'Easy Integration',
                description: 'Seamlessly integrate with your existing authentication system.'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-card p-6 rounded-lg shadow-sm border">
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to secure your application?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of developers who trust RLS Guard Dog for their data security needs.
          </p>
          <Button size="lg" asChild>
            <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started for Free'}
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} RLS Guard Dog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
