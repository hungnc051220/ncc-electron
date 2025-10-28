import Image from "next/image";

const AuthLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <main className="min-h-screen auth-bg bg-cover bg-center bg-no-repeat flex items-center justify-start px-40">
      <section className="">
        <div className="auth-box h-[90vh] max-h-[936px]">
          <Image
            src="/images/logo-text.svg"
            alt="logo"
            width={144}
            height={44}
            className="w-auto h-[44px] cursor-pointer mb-[100px]"
          />
          {children}
        </div>
      </section>
    </main>
  );
};

export default AuthLayout;
