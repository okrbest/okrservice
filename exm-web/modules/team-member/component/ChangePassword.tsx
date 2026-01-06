"use client"

import * as z from "zod"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const ChangePassword = ({
  changePassword,
  loading,
  setOpen,
}: {
  changePassword: (params: {
    currentPassword: string
    newPassword: string
    confirmation: string
  }) => void
  loading: boolean
  setOpen: (open: boolean) => void
}) => {
  const FormSchema = z.object({
    currentPassword: z.string({
      required_error: "Please enter current password.",
    }),
    newPassword: z.string({
      required_error: "Please enter new password.",
    }),
    confirmation: z.string({
      required_error: "Please enter again new password.",
    }),
  })

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  })

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    changePassword(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    {...field}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none z-10 cursor-pointer flex items-center justify-center"
                    aria-label={showCurrentPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                    tabIndex={0}
                  >
                    {showCurrentPassword ? (
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
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    {...field}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none z-10 cursor-pointer flex items-center justify-center"
                    aria-label={showNewPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                    tabIndex={0}
                  >
                    {showNewPassword ? (
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
        <FormField
          control={form.control}
          name="confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Re-type Password to confirm</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmation ? "text" : "password"}
                    {...field}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmation(!showConfirmation)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none z-10 cursor-pointer flex items-center justify-center"
                    aria-label={showConfirmation ? "비밀번호 숨기기" : "비밀번호 보기"}
                    tabIndex={0}
                  >
                    {showConfirmation ? (
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
        <div className="flex justify-center items-center">
          <Button
            className="bg-[#BFBFBF] mr-6 font-bold uppercase"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="font-bold uppercase"
            loading={loading}
          >
            Change
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default ChangePassword
