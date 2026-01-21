"use client";

import Image from "next/image";
import "react-simple-keyboard/build/css/index.css";
import SignInForm from "./components/sign-in-form";

const SignInPage = () => {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 z-0 auth-bg bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/logo-text.png"
                alt="logo"
                width={144}
                height={44}
                className="w-auto h-11 cursor-pointer"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Đăng nhập</h1>
            <p className="text-muted-foreground">
              Đăng nhập với bàn phím ảo bảo mật
            </p>
          </div>

          <SignInForm />

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Sử dụng bàn phím ảo để bảo vệ khỏi keylogger</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
