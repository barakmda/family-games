import { Composition } from "remotion";
import { GreetingVideo } from "./compositions/GreetingVideo";
import { greetingSchema } from "./schemas";

const FPS = 30;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="GreetingVideo"
        component={GreetingVideo}
        schema={greetingSchema}
        defaultProps={{
          familyName: "משפחת כהן",
          greetingText: 'ברוכים הבאים לממ"ד',
          personName: "",
          backgroundColor: "#78350f",
          textColor: "#fffbeb",
          fontSize: 72,
          durationInSeconds: 5,
        }}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={5 * FPS}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationInSeconds * FPS),
        })}
      />
    </>
  );
};
