import SlotMachine from '../components/SlotMachine';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <h1 className="text-4xl md:text-6xl font-extrabold text-yellow-400 mb-4 drop-shadow-lg text-center">Online Slot Machine</h1>
      <p className="text-lg text-gray-300 mb-8 text-center max-w-xl">Try your luck! Pull the lever and see if you can beat the house. But beware: walking away with your winnings won't be easy</p>
      <SlotMachine />
    </div>
  );
}
