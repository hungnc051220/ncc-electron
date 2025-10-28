import SignInForm from "./components/sign-in-form";

const SignInPage = () => {
  return (
    <>
      <p className="text-5xl font-bold mb-11 text-center">Đăng nhập</p>
      <SignInForm />
      <div className="mt-auto">
        <p className="text-center text-trunks">
          Bạn không thể đăng nhập?{" "}
          <a href="tel:012345678" className="text-primary underline ml-1">
            Liên hệ ngay
          </a>
        </p>
      </div>
    </>
  );
};

export default SignInPage;
