const Background = () => (
  <div
    className="absolute inset-0 bg-cover bg-center z-0"
    style={{
      // backgroundImage: `url('/images/hero-bg.jpg')`,
      backgroundImage: `url('/images/192.jpg')`,
    }}
  >
    {/* Optional overlay */}
    <div className="absolute inset-0 backdrop-brightness-50" />
  </div>
);

export default Background;
