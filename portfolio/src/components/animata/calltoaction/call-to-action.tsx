import { DollarSign, KeyRound, Timer } from "lucide-react"
import { motion } from "framer-motion"

const Feature89 = () => {
  return (
    <section className="overflow-hidden py-32">
      <div className="container relative">
        <div className="pointer-events-none absolute inset-0 -top-20 -z-10 mx-auto hidden size-[500px] bg-[radial-gradient(hsl(var(--muted-foreground))_1px,transparent_1px)] opacity-25 [background-size:6px_6px] [mask-image:radial-gradient(circle_at_center,white_250px,transparent_250px)] lg:block"></div>
        <div className="relative flex justify-between gap-16">
          <div className="from-background pointer-events-none absolute inset-0 hidden bg-gradient-to-t via-transparent to-transparent lg:block"></div>

          <motion.div
            className="w-full max-w-96 shrink-0 justify-between"
            initial={{ opacity: 0.95 }}
            whileInView={{
              opacity: 1,
              transition: { duration: 0.5 }
            }}
            viewport={{ once: true }}
          >
            <motion.p
              className="text-muted-foreground font-mono text-xs"
              whileHover={{
                color: "hsl(var(--primary))",
                transition: { duration: 0.3 }
              }}
            >
              What's the solution?
            </motion.p>
            <motion.h2
              className="mb-3 mt-6 text-3xl font-medium lg:text-4xl"
              whileHover={{
                x: 5,
                transition: { duration: 0.2 }
              }}
            >
              Let Streamline handle the details
            </motion.h2>
            <motion.p
              className="text-muted-foreground text-sm"
              whileHover={{
                opacity: 0.8,
                transition: { duration: 0.3 }
              }}
            >
              Streamline optimizes your workflow from start to finish. It
              gathers information, generates reports, automates tasks, and
              delivers results—all in one seamless system.
            </motion.p>
          </motion.div>
          <div className="hidden w-full max-w-3xl shrink-0 lg:block">
            <motion.div
              whileHover={{
                scale: 1.03,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                transition: { duration: 0.3 }
              }}
            >
              <img
                src="https://placehold.co/900/EBEDED/C3C9C9?text=Y&font=poppins.svg"
                alt="placeholder"
                className="max-h-[450px] w-full min-w-[450px] max-w-3xl rounded-lg border object-cover"
              />
            </motion.div>
          </div>
        </div>
        <motion.div
          className="relative mt-8 grid md:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.5,
              staggerChildren: 0.1
            }
          }}
          viewport={{ once: true }}
        >
          <motion.div
            className="flex flex-col gap-y-6 px-2 py-10 md:p-6 lg:p-8"
            whileHover={{
              scale: 1.03,
              backgroundColor: "rgba(0, 0, 0, 0.02)",
              transition: { duration: 0.3 }
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.3 }
            }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{
                scale: 1.2,
                rotate: 10,
                transition: { duration: 0.2 }
              }}
            >
              <Timer />
            </motion.div>
            <div>
              <motion.h3
                className="text-lg font-medium"
                whileHover={{
                  x: 5,
                  transition: { duration: 0.2 }
                }}
              >
                Maximize efficiency
              </motion.h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Skip the manual tasks and complex setups. With Streamline, you
                can focus on what matters most while the system handles the
                rest.
              </p>
            </div>
          </motion.div>
          <motion.div
            className="flex flex-col gap-y-6 px-2 py-10 md:p-6 lg:p-8"
            whileHover={{
              scale: 1.03,
              backgroundColor: "rgba(0, 0, 0, 0.02)",
              transition: { duration: 0.3 }
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, delay: 0.1 }
            }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{
                scale: 1.2,
                rotate: 10,
                transition: { duration: 0.2 }
              }}
            >
              <DollarSign />
            </motion.div>
            <div>
              <motion.h3
                className="text-lg font-medium"
                whileHover={{
                  x: 5,
                  transition: { duration: 0.2 }
                }}
              >
                Optimize resources
              </motion.h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Don't overspend on unnecessary tools or teams. Keep your
                operations lean and efficient by automating your workflows with
                Streamline.
              </p>
            </div>
          </motion.div>
          <motion.div
            className="flex flex-col gap-y-6 px-2 py-10 md:p-6 lg:p-8"
            whileHover={{
              scale: 1.03,
              backgroundColor: "rgba(0, 0, 0, 0.02)",
              transition: { duration: 0.3 }
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, delay: 0.2 }
            }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{
                scale: 1.2,
                rotate: 10,
                transition: { duration: 0.2 }
              }}
            >
              <KeyRound />
            </motion.div>
            <div>
              <motion.h3
                className="text-lg font-medium"
                whileHover={{
                  x: 5,
                  transition: { duration: 0.2 }
                }}
              >
                Simplify operations
              </motion.h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Say goodbye to managing multiple platforms. Streamline takes
                care of all the heavy lifting, ensuring consistent results with
                minimal hassle.
              </p>
            </div>
          </motion.div>
          <div className="bg-input absolute -inset-x-4 top-0 h-px md:hidden"></div>
          <div className="bg-input absolute -inset-x-4 top-[-0.5px] row-start-2 h-px md:hidden"></div>
          <div className="bg-input absolute -inset-x-4 top-[-0.5px] row-start-3 h-px md:hidden"></div>
          <div className="bg-input absolute -inset-x-4 bottom-0 row-start-4 h-px md:hidden"></div>
          <div className="bg-input absolute -left-2 -top-2 bottom-0 w-px md:hidden"></div>
          <div className="bg-input absolute -right-2 -top-2 bottom-0 col-start-2 w-px md:hidden"></div>
          <div className="bg-input absolute -inset-x-2 top-0 hidden h-px md:block"></div>
          <div className="bg-input absolute -top-2 bottom-0 left-0 hidden w-px md:block"></div>
          <div className="bg-input absolute -left-[0.5px] -top-2 bottom-0 col-start-2 hidden w-px md:block"></div>
          <div className="bg-input absolute -left-[0.5px] -top-2 bottom-0 col-start-3 hidden w-px md:block"></div>
          <div className="bg-input absolute -top-2 bottom-0 right-0 hidden w-px md:block"></div>
        </motion.div>
      </div>
    </section>
  )
}

export default Feature89
