import { Check } from 'lucide-react';

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PricingFeature[];
  popular?: boolean;
  buttonText: string;
  buttonVariant?: 'primary' | 'secondary';
}

export default function PricingCard({
  name,
  price,
  period,
  description,
  features,
  popular = false,
  buttonText,
  buttonVariant = 'secondary'
}: PricingCardProps) {
  return (
    <div className={`relative bg-[#0D0F18] rounded-xl border-2 p-4 transition-all duration-200 hover:bg-white/5 ${
      popular ? 'border-[#6A3DF4]/50 scale-105' : 'border-white/10'
    }`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-[#6A3DF4] text-white px-4 py-2 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
        <div className="mb-4">
          <span className="text-5xl font-bold text-white">{price}</span>
          <span className="text-[#AAB0C0] ml-2">{period}</span>
        </div>
        <p className="text-[#AAB0C0]">{description}</p>
      </div>

      <div className="mb-8">
        <ul className="space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                feature.included ? 'bg-[#2ECC71]/20' : 'bg-[#7F8C8D]/20'
              }`}>
                <Check className={`w-3 h-3 ${
                  feature.included ? 'text-[#2ECC71]' : 'text-[#7F8C8D]'
                }`} />
              </div>
              <span className={`text-sm ${
                feature.included ? 'text-[#AAB0C0]' : 'text-[#7F8C8D]'
              }`}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
        buttonVariant === 'primary'
          ? 'bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]'
          : 'bg-[#0D0F18] hover:bg-white/5 text-white border border-white/10'
      }`}>
        {buttonText}
      </button>
    </div>
  );
}
