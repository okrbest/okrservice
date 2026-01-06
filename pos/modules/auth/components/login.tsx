"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import ChooseConfig from "../chooseConfig"
import { IHandleLogin } from "../login"

const FormSchema = z.object({
  email: z
    .string({
      required_error: "Нэвтрэхийн тулд имэйл оруулна уу.",
    })
    .email(),
  password: z
    .string({
      required_error: "Нэвтрэхийн тулд нууц үг оруулна уу",
    })
    .min(8, { message: "Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой" }),
})

const Login = ({
  loading,
  login,
}: {
  loading?: boolean
  login: IHandleLogin
}) => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  })
  const [showPassword, setShowPassword] = useState(false)
  const onSubmit = (data: z.infer<typeof FormSchema>) => login(data)

  return (
    <>
      <ChooseConfig />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="cashier@erxes.io" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      {...field}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none z-10 cursor-pointer flex items-center justify-center"
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                      tabIndex={0}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full font-bold uppercase"
            loading={loading}
          >
            Log in
          </Button>
        </form>
      </Form>
    </>
  )
}

export default Login
